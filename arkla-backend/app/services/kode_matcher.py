"""
ARKLA Backend - Kode Arsip Matcher
Optional feature for matching documents to Kode Arsip.
"""

import os
import logging
from typing import List, Optional
from dataclasses import dataclass

import pandas as pd

from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)


@dataclass
class KodeCandidate:
    """Kode Arsip candidate with confidence."""
    kode: str
    keterangan: str
    confidence: float
    reasoning: Optional[str] = None


class KodeArsipMatcher:
    """
    Kode Arsip matching service.
    This is a BONUS/OPTIONAL feature.
    """
    
    def __init__(self):
        self.kode_data: Optional[pd.DataFrame] = None
        self._load_master_data()
    
    def _load_master_data(self):
        """Load Kode Arsip master data from database or CSV."""
        try:
            # Try database first
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT kode, keterangan FROM ref_klasifikasi")
                rows = cursor.fetchall()
                
                if rows:
                    self.kode_data = pd.DataFrame(
                        [dict(row) for row in rows],
                        columns=['kode', 'keterangan']
                    )
                    logger.info(f"Loaded {len(self.kode_data)} Kode Arsip from database")
                    return
            
            # Fallback to CSV
            csv_path = os.path.join("app", "data", "KODE_KLASIFIKASI.csv")
            if os.path.exists(csv_path):
                self.kode_data = pd.read_csv(csv_path)
                logger.info(f"Loaded {len(self.kode_data)} Kode Arsip from CSV")
            
        except Exception as e:
            logger.error(f"Failed to load Kode Arsip data: {e}")
            self.kode_data = None
    
    def is_enabled(self) -> bool:
        """Check if Kode matching feature is enabled."""
        return settings.gemini_kode_matching_enabled
    
    def match(
        self,
        isi_ringkas: str,
        surat_id: str
    ) -> Optional[List[KodeCandidate]]:
        """
        Find matching Kode Arsip candidates.
        
        Args:
            isi_ringkas: Document summary
            surat_id: Surat ID for tracking
        
        Returns:
            List of KodeCandidate or None if disabled/unavailable
        """
        if not self.is_enabled():
            return None
        
        if self.kode_data is None or self.kode_data.empty:
            logger.warning("Kode Arsip data not available")
            return None
        
        if not isi_ringkas:
            return None
        
        # Simple keyword matching for now
        # In production, use Gemini for semantic matching
        candidates = self._keyword_match(isi_ringkas)
        
        if candidates:
            logger.info(f"Found {len(candidates)} Kode candidates", extra={
                "surat_id": surat_id
            })
        
        return candidates[:3] if candidates else None
    
    def _keyword_match(self, text: str) -> List[KodeCandidate]:
        """Simple keyword matching for Kode Arsip."""
        if self.kode_data is None:
            return []
        
        text_lower = text.lower()
        candidates = []
        
        for _, row in self.kode_data.iterrows():
            keterangan = str(row.get('keterangan', '')).lower()
            
            # Calculate simple match score
            words = keterangan.split()
            matches = sum(1 for word in words if word in text_lower)
            
            if matches > 0:
                confidence = min(matches / max(len(words), 1), 1.0) * 0.7
                candidates.append(KodeCandidate(
                    kode=str(row['kode']),
                    keterangan=str(row.get('keterangan', '')),
                    confidence=confidence
                ))
        
        # Sort by confidence
        candidates.sort(key=lambda x: x.confidence, reverse=True)
        
        return candidates


# Singleton instance
kode_matcher = KodeArsipMatcher()
