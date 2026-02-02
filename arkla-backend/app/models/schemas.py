from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime
from enum import Enum


# ========== ENUMS ==========
class KategoriSurat(str, Enum):
    MASUK_BIASA = "masuk_biasa"
    UNDANGAN = "undangan"
    MASUK_PENTING = "masuk_penting"
    KELUAR = "keluar"
    KELUAR_SEKWAN = "keluar_sekwan"
    RAHASIA = "rahasia"


class ProcessingStatus(str, Enum):
    SUCCESS = "success"
    PARTIAL_SUCCESS = "partial_success"
    ERROR = "error"


# ========== GEMINI API USAGE ==========
class GeminiApiUsage(BaseModel):
    ocr_tokens: int = 0
    summarization_tokens: int = 0
    auto_fill_tokens: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    estimated_cost_usd: float = 0.0


# ========== CONFIDENCE BREAKDOWN ==========
class ConfidenceBreakdown(BaseModel):
    overall: float
    breakdown: Dict[str, float] = {}
    note: Optional[str] = None


# ========== EXTRACTED DATA ==========
class ExtractedField(BaseModel):
    value: Optional[str] = None
    confidence: float = 0.0


class ExtractedData(BaseModel):
    # Identitas Surat
    nomor_urut: Optional[str] = None
    index_surat: Optional[str] = None
    kode: Optional[str] = None
    nomor_surat: Optional[str] = None
    
    # Tanggal-tanggal
    tgl_surat: Optional[str] = None
    tgl_surat_masuk: Optional[str] = None
    tgl_masuk: Optional[str] = None
    tgl_masuk_surat: Optional[str] = None
    tgl_terima_surat: Optional[str] = None
    tgl_diteruskan: Optional[str] = None
    tgl_surat_turun: Optional[str] = None
    tgl_penyelesaian: Optional[str] = None
    tgl_keluar: Optional[str] = None
    
    # Konten
    isi_ringkas: Optional[str] = None
    lampiran: Optional[str] = None
    
    # Pihak terkait
    asal_surat: Optional[str] = None
    kepada: Optional[str] = None
    tujuan: Optional[str] = None
    diperuntukan: Optional[str] = None
    pengolah: Optional[str] = None
    
    # Disposisi & Catatan
    disposisi_ketua: Optional[str] = None
    disposisi_sekwan: Optional[str] = None
    catatan: Optional[str] = None
    keterangan: Optional[str] = None
    
    # Legacy fields (for backward compatibility)
    tingkat_keamanan: Optional[str] = None
    nomor_register: Optional[str] = None
    
    # Raw OCR text (for fallback)
    raw_ocr_text: Optional[str] = None


# ========== KODE ARSIP CANDIDATE ==========
class KodeCandidate(BaseModel):
    kode: str
    keterangan: str
    confidence: float
    reasoning: Optional[str] = None


# ========== PROCESS SURAT RESPONSE ==========
class ProcessSuratResponse(BaseModel):
    status: ProcessingStatus
    surat_id: str
    kategori: KategoriSurat
    processing_time_ms: int
    steps_completed: List[str]
    
    extracted_data: ExtractedData
    isi_ringkas: Optional[str] = None
    isi_ringkas_confidence: Optional[float] = None
    
    confidence: ConfidenceBreakdown
    requires_manual_review: bool = False
    low_confidence_fields: List[str] = []
    
    gemini_api_usage: GeminiApiUsage
    kode_candidates: Optional[List[KodeCandidate]] = None
    
    # For partial success
    message: Optional[str] = None
    fallback_reason: Optional[str] = None
    steps_failed: Optional[List[str]] = None


# ========== ERROR RESPONSE ==========
class ErrorDetails(BaseModel):
    step_failed: Optional[str] = None
    error_type: Optional[str] = None
    retry_after_seconds: Optional[int] = None
    suggestion: Optional[str] = None


class ErrorResponse(BaseModel):
    status: str = "error"
    code: str
    message: str
    surat_id: Optional[str] = None
    details: Optional[ErrorDetails] = None
    timestamp: str


# ========== VERIFY REQUEST ==========
class VerifyRequest(BaseModel):
    surat_id: str
    extracted_data: Dict[str, Any]
    kode_arsip: Optional[str] = None


class VerifyResponse(BaseModel):
    status: str = "success"
    surat_id: str
    nomor_urut_display: str
    message: str = "Surat berhasil disimpan"


# ========== SURAT LIST RESPONSE ==========
class SuratListItem(BaseModel):
    id: str
    kategori: KategoriSurat
    nomor_urut_display: Optional[str] = None
    nomor_surat: Optional[str] = None
    asal_surat: Optional[str] = None
    tgl_surat: Optional[str] = None
    isi_ringkas: Optional[str] = None
    kode_arsip: Optional[str] = None
    created_at: str


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class SuratListResponse(BaseModel):
    status: str = "success"
    data: List[SuratListItem]
    pagination: PaginationMeta


# ========== EXPORT REQUEST ==========
class ExportRequest(BaseModel):
    kategori: KategoriSurat
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    format: str = "xlsx"  # xlsx or csv


class ExportResponse(BaseModel):
    status: str = "success"
    file_url: str
    filename: str
    record_count: int


# ========== MASTER DATA IMPORT ==========
class ImportMasterDataResponse(BaseModel):
    status: str = "success"
    added: int
    updated: int
    timestamp: str
