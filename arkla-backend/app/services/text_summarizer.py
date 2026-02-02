import re
import logging
from typing import Tuple
from dataclasses import dataclass

from app.services.gemini_engine import gemini_engine, GeminiResult

logger = logging.getLogger(__name__)


@dataclass
class SummaryResult:
    success: bool
    summary: str
    confidence: float
    used_fallback: bool = False
    tokens_used: int = 0


class TextSummarizer:
    MAX_SUMMARY_LENGTH = 200
    
    def summarize(
        self,
        text: str,
        kategori: str,
        surat_id: str
    ) -> SummaryResult:
        if not text or not text.strip():
            return SummaryResult(
                success=True,
                summary="",
                confidence=0.0,
                used_fallback=True
            )
        
        # Try Gemini first
        if gemini_engine.is_available():
            result = gemini_engine.summarize_text(text, kategori, surat_id)
            
            if result.success and result.data:
                summary = result.data.strip()[:self.MAX_SUMMARY_LENGTH]
                
                logger.info(f"Gemini summarization successful", extra={
                    "surat_id": surat_id,
                    "summary_length": len(summary)
                })
                
                return SummaryResult(
                    success=True,
                    summary=summary,
                    confidence=0.85,
                    used_fallback=False,
                    tokens_used=result.input_tokens + result.output_tokens
                )
        
        # Fallback to Regex-based extraction
        logger.warning(f"Using Regex fallback for summarization", extra={
            "surat_id": surat_id
        })
        
        summary, confidence = self._regex_summarize(text)
        
        return SummaryResult(
            success=True,
            summary=summary,
            confidence=confidence,
            used_fallback=True
        )
    
    def _regex_summarize(self, text: str) -> Tuple[str, float]:
        # Clean text
        text = re.sub(r'\s+', ' ', text).strip()
        
        if not text:
            return "", 0.0
        
        # Try to find "Perihal" or "Hal" section
        perihal_match = re.search(
            r'(?:perihal|hal|re|subject)[:\s]+([^\n.]+)',
            text,
            re.IGNORECASE
        )
        if perihal_match:
            summary = perihal_match.group(1).strip()[:self.MAX_SUMMARY_LENGTH]
            return summary, 0.60
        
        # Try to extract first meaningful sentence
        sentences = re.split(r'[.!?]\s+', text)
        
        for sentence in sentences:
            # Skip very short sentences or headers
            if len(sentence) > 20 and not re.match(r'^[A-Z\s]+$', sentence):
                summary = sentence.strip()[:self.MAX_SUMMARY_LENGTH]
                return summary, 0.50
        
        # Last resort: first 200 chars
        summary = text[:self.MAX_SUMMARY_LENGTH]
        return summary, 0.40


# Singleton instance
text_summarizer = TextSummarizer()
