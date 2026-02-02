import os
import uuid
import hashlib
import logging
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def generate_surat_id() -> str:
    return str(uuid.uuid4())


def get_file_hash(file_bytes: bytes) -> str:
    return hashlib.md5(file_bytes).hexdigest()


def get_timestamp() -> str:
    return datetime.now().isoformat()


def calculate_confidence_average(confidences: Dict[str, float]) -> float:
    if not confidences:
        return 0.0
    values = [v for v in confidences.values() if v is not None]
    return sum(values) / len(values) if values else 0.0


def sanitize_filename(filename: str) -> str:
    # Remove path separators and null bytes
    sanitized = os.path.basename(filename)
    sanitized = sanitized.replace('\x00', '')
    return sanitized


def get_file_extension(filename: str) -> str:
    _, ext = os.path.splitext(filename)
    return ext.lower()


def ensure_upload_dir(surat_id: str) -> str:
    upload_dir = os.path.join("uploads", surat_id)
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


def cleanup_processed_files(surat_id: str):
    upload_dir = os.path.join("uploads", surat_id)
    processed_file = os.path.join(upload_dir, "processed.jpg")
    
    if os.path.exists(processed_file):
        try:
            os.remove(processed_file)
            logger.info(f"Cleaned up processed file for {surat_id}")
        except Exception as e:
            logger.warning(f"Failed to cleanup {processed_file}: {e}")


def format_error_response(
    code: str,
    message: str,
    surat_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    response = {
        "status": "error",
        "code": code,
        "message": message,
        "timestamp": get_timestamp()
    }
    
    if surat_id:
        response["surat_id"] = surat_id
    
    if details:
        response["details"] = details
    
    return response


def validate_date_format(date_str: str) -> Optional[str]:
    if not date_str:
        return None
    
    # Common date formats to try
    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d %B %Y",
        "%d %b %Y",
        "%Y/%m/%d",
    ]
    
    for fmt in formats:
        try:
            parsed = datetime.strptime(date_str.strip(), fmt)
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    logger.warning(f"Could not parse date: {date_str}")
    return None


def get_surat_table_name(kategori: str) -> str:
    """Convert kategori to table name."""
    from app.core.constants import KategoriSurat
    
    kategori_lower = kategori.lower().replace(" ", "_")
    
    # Map kategori to table names (matching actual KategoriSurat enum values)
    table_map = {
        KategoriSurat.MASUK_BIASA.value: "surat_masuk_biasa",
        KategoriSurat.UNDANGAN.value: "surat_undangan", 
        KategoriSurat.MASUK_PENTING.value: "surat_masuk_penting",
        KategoriSurat.KELUAR.value: "surat_keluar",
        KategoriSurat.KELUAR_SEKWAN.value: "surat_keluar_sekwan",
        KategoriSurat.RAHASIA.value: "surat_rahasia",
    }
    
    return table_map.get(kategori_lower, f"surat_{kategori_lower}")


def validate_kategori(kategori: str) -> bool:
    """Check if kategori is valid."""
    from app.core.constants import KategoriSurat
    
    valid_categories = [e.value for e in KategoriSurat]
    return kategori.lower().replace(" ", "_") in valid_categories
