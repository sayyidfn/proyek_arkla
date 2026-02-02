import re
import json
import logging
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass

from app.services.gemini_engine import gemini_engine
from app.core.constants import CATEGORY_SCHEMAS
from app.core.utils import validate_date_format

logger = logging.getLogger(__name__)


@dataclass
class FieldResult:
    value: Optional[str]
    confidence: float


@dataclass
class AutoFillResult:
    success: bool
    fields: Dict[str, FieldResult]
    used_fallback: bool = False
    tokens_used: int = 0


class AutoFieldFiller:
    # Regex patterns for common fields
    PATTERNS = {
        # Identitas
        "nomor_urut": [
            r'(?:no(?:mor)?\.?\s*urut|nomor)[.:\s]*(\d+)',
            r'^(\d+)[.,\s]',
        ],
        "index_surat": [
            r'(?:index|indeks|jenis)[.:\s]*([^\n,;]+)',
        ],
        "kode": [
            r'(?:kode|klasifikasi)[.:\s]*([A-Za-z0-9\.\-]+)',
            r'\b(\d{3}(?:\.\d+)?)\b',
        ],
        "nomor_surat": [
            r'(?:no(?:mor)?|nomor\s*surat)[.:\s]*([A-Za-z0-9\-/\.]+)',
            r'([A-Za-z0-9]+/[A-Za-z0-9]+/[A-Za-z0-9/\-]+)',
            r'(?:^|\s)(\d+/[A-Za-z]+/[IVXLCDM]+/\d+)',
        ],
        
        # Tanggal-tanggal
        "tgl_surat": [
            r'(?:tanggal|tgl|dated?)[.:\s]*(\d{1,2}[\s\-/]\w+[\s\-/]\d{2,4})',
            r'(\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d{4})',
            r'(\d{1,2}/\d{1,2}/\d{2,4})',
            r'(\d{4}-\d{2}-\d{2})',
        ],
        "tgl_surat_masuk": [
            r'(?:tgl\.?\s*surat\s*masuk|tanggal\s*masuk)[.:\s]*(\d{1,2}[\s\-/]\w+[\s\-/]\d{2,4})',
            r'(\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d{4})',
        ],
        "tgl_masuk": [
            r'(?:tgl\.?\s*masuk|tanggal\s*masuk)[.:\s]*(\d{1,2}[\s\-/]\w+[\s\-/]\d{2,4})',
        ],
        "tgl_masuk_surat": [
            r'(?:tgl\.?\s*masuk\s*surat)[.:\s]*(\d{1,2}[\s\-/]\w+[\s\-/]\d{2,4})',
        ],
        "tgl_terima_surat": [
            r'(?:tgl\.?\s*terima|tanggal\s*terima)[.:\s]*(\d{1,2}[\s\-/]\w+[\s\-/]\d{2,4})',
        ],
        "tgl_diteruskan": [
            r'(?:tgl\.?\s*diteruskan|tanggal\s*diteruskan)[.:\s]*(\d{1,2}[\s\-/]\w+[\s\-/]\d{2,4})',
        ],
        "tgl_surat_turun": [
            r'(?:tgl\.?\s*surat\s*turun|tanggal\s*turun)[.:\s]*(\d{1,2}[\s\-/]\w+[\s\-/]\d{2,4})',
        ],
        "tgl_penyelesaian": [
            r'(?:tgl\.?\s*penyelesaian|tanggal\s*selesai)[.:\s]*(\d{1,2}[\s\-/]\w+[\s\-/]\d{2,4})',
        ],
        "tgl_keluar": [
            r'(?:tgl\.?\s*keluar|tanggal\s*keluar)[.:\s]*(\d{1,2}[\s\-/]\w+[\s\-/]\d{2,4})',
        ],
        
        # Pihak terkait
        "asal_surat": [
            r'(?:dari|from|pengirim|asal)[.:\s]*([^\n]+)',
            r'(?:kepala|direktur|ketua)\s+([^\n,]+)',
        ],
        "kepada": [
            r'(?:kepada|yth|to)[.:\s]*([^\n]+)',
        ],
        "tujuan": [
            r'(?:tujuan|ditujukan)[.:\s]*([^\n]+)',
        ],
        "diperuntukan": [
            r'(?:untuk|diperuntukan|bagi)[.:\s]*([^\n]+)',
        ],
        "pengolah": [
            r'(?:pengolah|oleh|diolah|bag(?:ian)?)[.:\s]*([^\n]+)',
        ],
        
        # Konten
        "lampiran": [
            r'(?:lampiran|lamp\.?)[.:\s]*(\d+|[^\n]+)',
        ],
        "isi_ringkas": [
            r'(?:isi\s*ringkas|perihal|hal|subject)[.:\s]*([^\n]+)',
        ],
        
        # Disposisi
        "disposisi_ketua": [
            r'(?:disposisi\s*ketua|catatan\s*ketua)[.:\s]*([^\n]+)',
        ],
        "disposisi_sekwan": [
            r'(?:disposisi\s*sekwan|catatan\s*sekwan)[.:\s]*([^\n]+)',
        ],
        "catatan": [
            r'(?:catatan|keterangan|note)[.:\s]*([^\n]+)',
        ],
        "keterangan": [
            r'(?:keterangan|ket\.?)[.:\s]*([^\n]+)',
        ],
        
        # Legacy
        "tingkat_keamanan": [
            r'(?:tingkat\s*keamanan|klasifikasi\s*keamanan)[.:\s]*([^\n]+)',
            r'(rahasia|sangat\s*rahasia|biasa|terbatas)',
        ],
        "nomor_register": [
            r'(?:no(?:mor)?\s*register|reg)[.:\s]*([A-Za-z0-9\-/]+)',
        ],
    }
    
    def extract_fields(
        self,
        text: str,
        kategori: str,
        surat_id: str
    ) -> AutoFillResult:
        # Get required fields for this category
        required_fields = CATEGORY_SCHEMAS.get(kategori, [])
        
        if not required_fields:
            logger.warning(f"Unknown kategori: {kategori}")
            required_fields = ["nomor_surat", "tgl_surat", "isi_ringkas"]
        
        # Try Gemini first
        if gemini_engine.is_available():
            result = gemini_engine.extract_fields(text, required_fields, surat_id)
            
            if result.success and result.data:
                fields = self._parse_gemini_response(result.data, required_fields)
                
                if fields:
                    logger.info(f"Gemini auto-fill successful", extra={
                        "surat_id": surat_id,
                        "fields_extracted": len(fields)
                    })
                    
                    return AutoFillResult(
                        success=True,
                        fields=fields,
                        used_fallback=False,
                        tokens_used=result.input_tokens + result.output_tokens
                    )
        
        # Fallback to Regex
        logger.warning(f"Using Regex fallback for auto-fill", extra={
            "surat_id": surat_id
        })
        
        fields = self._regex_extract(text, required_fields)
        
        return AutoFillResult(
            success=True,
            fields=fields,
            used_fallback=True
        )
    
    def _parse_gemini_response(
        self,
        response: str,
        required_fields: list
    ) -> Optional[Dict[str, FieldResult]]:
        try:
            # Clean response - remove markdown code blocks if present
            response = response.strip()
            if response.startswith("```"):
                response = re.sub(r'^```(?:json)?\s*', '', response)
                response = re.sub(r'\s*```$', '', response)
            
            # Try to parse JSON
            data = json.loads(response)
            
            fields = {}
            for field in required_fields:
                value = data.get(field)
                
                if value is not None and value != "null":
                    # Validate date fields
                    if "tgl" in field or "tanggal" in field:
                        value = validate_date_format(str(value)) or str(value)
                    
                    fields[field] = FieldResult(
                        value=str(value).strip(),
                        confidence=0.85
                    )
                else:
                    fields[field] = FieldResult(
                        value=None,
                        confidence=0.0
                    )
            
            return fields
            
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse Gemini JSON response: {e}")
            
            # Try to extract key-value pairs with regex
            return self._extract_from_malformed_json(response, required_fields)
        
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}")
            return None
    
    def _extract_from_malformed_json(
        self,
        response: str,
        required_fields: list
    ) -> Dict[str, FieldResult]:
        fields = {}
        
        for field in required_fields:
            # Try to find "field": "value" pattern
            pattern = rf'"{field}"[:\s]*"([^"]+)"'
            match = re.search(pattern, response, re.IGNORECASE)
            
            if match:
                value = match.group(1).strip()
                fields[field] = FieldResult(
                    value=value,
                    confidence=0.60  # Lower confidence for malformed
                )
            else:
                fields[field] = FieldResult(
                    value=None,
                    confidence=0.0
                )
        
        return fields
    
    def _regex_extract(
        self,
        text: str,
        required_fields: list
    ) -> Dict[str, FieldResult]:
        fields = {}
        
        for field in required_fields:
            value, confidence = self._extract_single_field(text, field)
            fields[field] = FieldResult(
                value=value,
                confidence=confidence
            )
        
        return fields
    
    def _extract_single_field(
        self,
        text: str,
        field: str
    ) -> Tuple[Optional[str], float]:
        patterns = self.PATTERNS.get(field, [])
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                value = match.group(1).strip()
                
                # Validate date fields
                if "tgl" in field or "tanggal" in field:
                    normalized = validate_date_format(value)
                    if normalized:
                        return normalized, 0.60
                    return value, 0.45
                
                return value, 0.55
        
        return None, 0.0


# Singleton instance
auto_filler = AutoFieldFiller()
