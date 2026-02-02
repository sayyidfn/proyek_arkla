import os
import time
import base64
import logging
import traceback
from typing import Optional, Dict, Any, Callable
from dataclasses import dataclass

from google import genai
from google.genai import types

from app.core.config import settings
from app.core.constants import (
    MAX_RETRIES, INITIAL_RETRY_DELAY, MAX_RETRY_DELAY, 
    RATE_LIMIT_DELAY, OCR_PROMPT, CATEGORY_SCHEMAS,
    GEMINI_INPUT_COST_PER_1M, GEMINI_OUTPUT_COST_PER_1M
)
from app.core.database import store_usage_log

logger = logging.getLogger(__name__)


@dataclass
class GeminiResult:
    success: bool
    data: Optional[str] = None
    input_tokens: int = 0
    output_tokens: int = 0
    cost: float = 0.0
    error: Optional[str] = None
    used_fallback: bool = False
    fallback_reason: Optional[str] = None


@dataclass
class UnifiedExtractionResult:
    success: bool
    raw_text: str = ""
    isi_ringkas: str = ""
    fields: Dict[str, Any] = None
    input_tokens: int = 0
    output_tokens: int = 0
    cost: float = 0.0
    error: Optional[str] = None
    
    def __post_init__(self):
        if self.fields is None:
            self.fields = {}


class GeminiEngine:
    def __init__(self):
        self.api_key = settings.google_api_key
        self.model_name = settings.gemini_model
        self.client = None
        
        if self.api_key:
            self._initialize_client()
    
    def _initialize_client(self):
        try:
            self.client = genai.Client(api_key=self.api_key)
            logger.info(f"Gemini client initialized with model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            self.client = None
    
    def is_available(self) -> bool:
        return self.client is not None and self.api_key is not None
    
    @staticmethod
    def exponential_backoff(attempt: int) -> int:
        delay = INITIAL_RETRY_DELAY * (2 ** attempt)
        return min(delay, MAX_RETRY_DELAY)
    
    @staticmethod
    def calculate_cost(input_tokens: int, output_tokens: int) -> float:
        input_cost = (input_tokens / 1_000_000) * GEMINI_INPUT_COST_PER_1M
        output_cost = (output_tokens / 1_000_000) * GEMINI_OUTPUT_COST_PER_1M
        return input_cost + output_cost
    
    def _call_with_retry(
        self,
        operation: str,
        api_call: Callable,
        surat_id: str
    ) -> GeminiResult:
        for attempt in range(MAX_RETRIES + 1):
            try:
                logger.info(f"{operation} starting", extra={
                    "surat_id": surat_id,
                    "attempt": attempt + 1
                })
                
                # Execute API call
                response = api_call()
                
                # Extract usage metadata
                input_tokens = 0
                output_tokens = 0
                if hasattr(response, 'usage_metadata'):
                    input_tokens = response.usage_metadata.prompt_token_count or 0
                    output_tokens = response.usage_metadata.candidates_token_count or 0
                
                cost = self.calculate_cost(input_tokens, output_tokens)
                
                # Store usage log
                store_usage_log(surat_id, operation, input_tokens, output_tokens, cost)
                
                logger.info(f"{operation} completed", extra={
                    "surat_id": surat_id,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cost": cost
                })
                
                return GeminiResult(
                    success=True,
                    data=response.text,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    cost=cost
                )
                
            except Exception as e:
                error_str = str(e).lower()
                
                # Rate limit error (429)
                if "429" in str(e) or "rate" in error_str:
                    logger.warning(f"{operation} rate limited", extra={
                        "surat_id": surat_id,
                        "attempt": attempt + 1,
                        "retry_after": RATE_LIMIT_DELAY
                    })
                    
                    if attempt < MAX_RETRIES:
                        time.sleep(RATE_LIMIT_DELAY)
                        continue
                
                # Connection/timeout error
                elif "timeout" in error_str or "connection" in error_str:
                    delay = self.exponential_backoff(attempt)
                    logger.warning(f"{operation} connection error", extra={
                        "surat_id": surat_id,
                        "attempt": attempt + 1,
                        "error": str(e),
                        "retry_delay": delay
                    })
                    
                    if attempt < MAX_RETRIES:
                        time.sleep(delay)
                        continue
                
                # Invalid API key (fatal)
                elif "api key" in error_str or "authentication" in error_str:
                    logger.error(f"{operation} invalid API key", extra={
                        "surat_id": surat_id,
                        "error": str(e)
                    })
                    return GeminiResult(
                        success=False,
                        error="GEMINI_CONFIG_ERROR",
                        fallback_reason="Invalid API key"
                    )
                
                # Server error (500+)
                elif "500" in str(e) or "503" in str(e) or "server" in error_str:
                    delay = self.exponential_backoff(attempt)
                    logger.warning(f"{operation} server error", extra={
                        "surat_id": surat_id,
                        "attempt": attempt + 1,
                        "error": str(e),
                        "retry_delay": delay
                    })
                    
                    if attempt < MAX_RETRIES:
                        time.sleep(delay)
                        continue
                
                # Unknown error
                else:
                    logger.error(f"{operation} unknown error", extra={
                        "surat_id": surat_id,
                        "error_type": type(e).__name__,
                        "error": str(e),
                        "traceback": traceback.format_exc()
                    })
                    
                    if attempt < MAX_RETRIES:
                        delay = self.exponential_backoff(attempt)
                        time.sleep(delay)
                        continue
        
        # All retries exhausted
        logger.error(f"{operation} failed after {MAX_RETRIES} retries", extra={
            "surat_id": surat_id
        })
        
        return GeminiResult(
            success=False,
            error=f"{operation.upper()}_FAILED",
            fallback_reason="Max retries exhausted"
        )
    
    def extract_text_from_image(
        self,
        image_path: str,
        surat_id: str
    ) -> GeminiResult:
        if not self.is_available():
            return GeminiResult(
                success=False,
                error="GEMINI_CONFIG_ERROR",
                fallback_reason="Gemini API not configured"
            )
        
        def api_call():
            # Read and encode image
            with open(image_path, "rb") as f:
                image_data = f.read()
            
            # Create image part
            image_part = types.Part.from_bytes(
                data=image_data,
                mime_type="image/jpeg"
            )
            
            # Generate content
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[OCR_PROMPT, image_part]
            )
            
            return response
        
        return self._call_with_retry("ocr", api_call, surat_id)
    
    def summarize_text(
        self,
        text: str,
        kategori: str,
        surat_id: str
    ) -> GeminiResult:
        if not self.is_available():
            return GeminiResult(
                success=False,
                error="GEMINI_NOT_AVAILABLE"
            )
        
        prompt = f"""Ringkas dokumen {kategori} berikut dalam 1-2 kalimat singkat.
Fokus pada tujuan utama dan informasi penting.

Teks dokumen:
{text[:4000]}

Ringkasan (dalam Bahasa Indonesia, maksimal 200 karakter):"""
        
        def api_call():
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response
        
        return self._call_with_retry("summarization", api_call, surat_id)
    
    def extract_fields(
        self,
        text: str,
        fields: list,
        surat_id: str
    ) -> GeminiResult:
        if not self.is_available():
            return GeminiResult(
                success=False,
                error="GEMINI_NOT_AVAILABLE"
            )
        
        fields_list = ", ".join(fields)
        prompt = f"""Dari teks dokumen berikut, ekstrak informasi untuk field-field ini:
{fields_list}

Teks dokumen:
{text[:4000]}

Berikan hasil dalam format JSON dengan field name sebagai key.
Jika field tidak ditemukan, gunakan null.
Untuk tanggal, gunakan format YYYY-MM-DD jika memungkinkan.

Contoh output:
{{"nomor_surat": "001/2026", "asal_surat": "Dinas ABC", "tgl_surat": "2026-01-28"}}

JSON Response:"""
        
        def api_call():
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response
        
        return self._call_with_retry("auto_fill", api_call, surat_id)
    
    def unified_extract(
        self,
        image_path: str,
        kategori: str,
        surat_id: str
    ) -> UnifiedExtractionResult:
        import json
        import re
        
        if not self.is_available():
            return UnifiedExtractionResult(
                success=False,
                error="GEMINI_CONFIG_ERROR"
            )
        
        # Get fields for this category
        fields = CATEGORY_SCHEMAS.get(kategori, ["isi_ringkas"])
        fields_list = ", ".join(fields)
        
        # Determine isi_ringkas instructions based on category
        if kategori == "undangan":
            isi_ringkas_instruction = """- isi_ringkas: Gunakan format "[nama kegiatan] pada [tanggal] di [tempat]"
  Contoh: "Rapat Koordinasi pada 28 Januari 2026 di Ruang Rapat DPRD"
  Jika tidak ada jadwal lengkap, tulis nama kegiatan saja."""
        else:
            isi_ringkas_instruction = """- isi_ringkas: PRIORITAS pertama, gunakan isi dari "Hal:" atau "Perihal:" jika ada di dokumen.
  Jika tidak ada Hal/Perihal, buat ringkasan singkat maksimal 100 karakter.
  Contoh: "Permohonan Revisi DPA Tahun 2026" (dari Hal:)"""
        
        # Create unified prompt
        unified_prompt = f"""Analisis dokumen surat ini dan berikan output dalam format JSON.

TUGAS:
1. Ekstrak SEMUA teks dari gambar dokumen ini
2. Buat isi ringkas sesuai aturan di bawah
3. Ekstrak field-field berikut: {fields_list}

OUTPUT FORMAT (JSON):
{{
    "raw_text": "teks lengkap dari dokumen...",
    "isi_ringkas": "ringkasan sesuai aturan",
    {', '.join([f'"{f}": "nilai atau null"' for f in fields])}
}}

ATURAN:
- raw_text: ekstrak semua teks persis seperti yang terlihat
{isi_ringkas_instruction}
- Untuk tanggal, gunakan format YYYY-MM-DD
- Jika field tidak ditemukan, gunakan null
- Output HANYA JSON, tanpa penjelasan tambahan"""
        
        def api_call():
            # Read and encode image
            with open(image_path, "rb") as f:
                image_data = f.read()
            
            # Create image part
            image_part = types.Part.from_bytes(
                data=image_data,
                mime_type="image/jpeg"
            )
            
            # Generate content
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[unified_prompt, image_part]
            )
            
            return response
        
        result = self._call_with_retry("unified_extract", api_call, surat_id)
        
        if not result.success:
            return UnifiedExtractionResult(
                success=False,
                error=result.error,
                input_tokens=result.input_tokens,
                output_tokens=result.output_tokens
            )
        
        # Parse JSON response
        try:
            response_text = result.data or ""
            
            # Try to extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                parsed = json.loads(json_match.group())
            else:
                # Fallback: try parsing entire response as JSON
                parsed = json.loads(response_text)
            
            raw_text = parsed.get("raw_text", "")
            isi_ringkas = parsed.get("isi_ringkas", "")
            
            # Extract fields
            extracted_fields = {}
            for field in fields:
                extracted_fields[field] = parsed.get(field)
            
            return UnifiedExtractionResult(
                success=True,
                raw_text=raw_text,
                isi_ringkas=isi_ringkas,
                fields=extracted_fields,
                input_tokens=result.input_tokens,
                output_tokens=result.output_tokens,
                cost=result.cost
            )
            
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON response, using raw text", extra={
                "surat_id": surat_id,
                "error": str(e)
            })
            
            # Fallback: use raw response as text
            return UnifiedExtractionResult(
                success=True,
                raw_text=result.data or "",
                isi_ringkas=result.data[:200] if result.data else "",
                fields={},
                input_tokens=result.input_tokens,
                output_tokens=result.output_tokens,
                cost=result.cost
            )


# Singleton instance
gemini_engine = GeminiEngine()
