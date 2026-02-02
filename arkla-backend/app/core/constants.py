from enum import Enum
from typing import Dict, List

# ========== KATEGORI SURAT ==========
class KategoriSurat(str, Enum):
    MASUK_BIASA = "masuk_biasa"
    UNDANGAN = "undangan"
    MASUK_PENTING = "masuk_penting"
    KELUAR = "keluar"
    KELUAR_SEKWAN = "keluar_sekwan"
    RAHASIA = "rahasia"


# ========== FIELD SCHEMAS PER KATEGORI ==========
# Sesuai dengan struktur dokumen CSV DPRD
CATEGORY_SCHEMAS: Dict[str, List[str]] = {
    "masuk_biasa": [
        "nomor_urut",
        "index_surat",
        "kode",
        "tgl_surat",
        "isi_ringkas",
        "asal_surat",
        "nomor_surat",
        "lampiran",
        "pengolah",
        "tgl_diteruskan",
        "disposisi_ketua",
        "tgl_masuk",
        "tujuan",
        "tgl_surat_turun",
        "disposisi_sekwan",
    ],
    "undangan": [
        "nomor_urut",
        "index_surat",
        "kode",
        "tgl_surat_masuk",
        "tgl_penyelesaian",
        "isi_ringkas",
        "asal_surat",
        "nomor_surat",
        "lampiran",
        "keterangan",
        "tgl_masuk_surat",
        "diperuntukan",
        "tgl_surat_turun",
        "disposisi_sekwan",
    ],
    "masuk_penting": [
        "nomor_urut",
        "index_surat",
        "kode",
        "tgl_surat_masuk",
        "isi_ringkas",
        "asal_surat",
        "nomor_surat",
        "lampiran",
        "pengolah",
        "tgl_diteruskan",
        "disposisi_ketua",
        "tgl_masuk",
        "tujuan",
        "tgl_surat_turun",
        "disposisi_sekwan",
    ],
    "keluar": [
        "nomor_urut",
        "index_surat",
        "kode",
        "isi_ringkas",
        "kepada",
        "pengolah",
        "tgl_surat",
        "lampiran",
        "catatan",
    ],
    "keluar_sekwan": [
        "nomor_urut",
        "index_surat",
        "kode",
        "isi_ringkas",
        "kepada",
        "pengolah",
        "tgl_surat",
        "lampiran",
        "catatan",
    ],
    "rahasia": [
        "nomor_urut",
        "index_surat",
        "kode",
        "tgl_terima_surat",
        "isi_ringkas",
        "asal_surat",
        "nomor_surat",
        "lampiran",
        "pengolah",
        "tgl_diteruskan",
        "catatan",
    ]
}

# ========== FILE CONSTANTS ==========
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_FORMATS = ["application/pdf", "image/jpeg", "image/png"]
ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"]

# ========== ERROR CODES ==========
class ErrorCode(str, Enum):
    INVALID_CATEGORY = "INVALID_CATEGORY"
    INVALID_FILE = "INVALID_FILE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    OCR_FAILED = "OCR_FAILED"
    NO_TEXT_EXTRACTED = "NO_TEXT_EXTRACTED"
    GEMINI_API_ERROR = "GEMINI_API_ERROR"
    GEMINI_RATE_LIMIT = "GEMINI_RATE_LIMIT"
    GEMINI_CONFIG_ERROR = "GEMINI_CONFIG_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    NOT_FOUND = "NOT_FOUND"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

# ========== GEMINI API ==========
class GeminiError(str, Enum):
    API_CONNECTION_ERROR = "GEMINI_CONNECTION_FAILED"
    RATE_LIMIT_ERROR = "GEMINI_RATE_LIMIT_429"
    INVALID_API_KEY = "GEMINI_API_KEY_INVALID"
    INVALID_REQUEST = "GEMINI_INVALID_REQUEST"
    API_TIMEOUT = "GEMINI_API_TIMEOUT"
    SERVER_ERROR = "GEMINI_SERVER_ERROR"
    UNKNOWN_ERROR = "GEMINI_UNKNOWN_ERROR"

# ========== RETRY STRATEGY ==========
MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 2  # seconds
MAX_RETRY_DELAY = 32  # seconds
RATE_LIMIT_DELAY = 60  # seconds for 429 errors

# ========== CONFIDENCE THRESHOLDS ==========
CONFIDENCE_HIGH = 0.80  # Auto-accept threshold
CONFIDENCE_MEDIUM = 0.60  # Needs review threshold
CONFIDENCE_LOW = 0.50  # Manual review required

# ========== GEMINI PROMPTS ==========
OCR_PROMPT = """Extract ALL text from this document image exactly as it appears.
Preserve the structure and formatting where possible.
Return only the extracted text, nothing else."""

SUMMARIZATION_PROMPT_TEMPLATE = """Ringkas dokumen {kategori} berikut dalam 1-2 kalimat singkat.
Fokus pada tujuan utama dan informasi penting.

Teks dokumen:
{text}

Ringkasan (dalam Bahasa Indonesia):"""

AUTO_FILL_PROMPT_TEMPLATE = """Dari teks dokumen berikut, ekstrak informasi untuk field-field ini:
{fields}

Teks dokumen:
{text}

Berikan hasil dalam format JSON dengan field name sebagai key.
Jika field tidak ditemukan, gunakan null.
Untuk tanggal, gunakan format YYYY-MM-DD jika memungkinkan.

JSON Response:"""

# ========== COST TRACKING ==========
# Gemini 1.5 Flash pricing (per 1M tokens)
GEMINI_INPUT_COST_PER_1M = 0.0075
GEMINI_OUTPUT_COST_PER_1M = 0.030
