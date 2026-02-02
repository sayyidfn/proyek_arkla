// ==================== KATEGORI SURAT ====================
// 6 kategori sesuai MCP: masuk_biasa, undangan, masuk_penting, keluar, keluar_sekwan, rahasia
export type KategoriSurat =
  | "masuk_biasa"
  | "undangan"
  | "masuk_penting"
  | "keluar"
  | "keluar_sekwan"
  | "rahasia";

// ==================== PROCESSING STATUS ====================
export type ProcessingStatus = "success" | "partial_success" | "error";

// ==================== DASHBOARD STATS ====================
export interface DashboardStats {
  total_arsip: number;
  pending_review: number;
  today_count: number;
  accuracy_rate: number; // Persentase 0-100
}

// ==================== SURAT LIST ITEM ====================
// Sesuai dengan response GET /api/v1/surat dari backend
export interface SuratListItem {
  id: string;
  kategori: KategoriSurat;
  nomor_urut_display: string | null;
  kode_arsip: string | null;
  isi_ringkas: string | null;
  overall_confidence: number | null;
  requires_manual_review: boolean;
  verified_at: string | null;
  created_at: string;
  asal_surat?: string | null; // Dari JOIN dengan tabel kategori
}

// ==================== SURAT DETAIL ====================
// Response dari GET /api/v1/surat/{surat_id}
export interface SuratDetail extends SuratListItem {
  // Identitas
  nomor_urut?: string;
  index_surat?: string;
  kode?: string;
  nomor_surat?: string;

  // Tanggal
  tgl_surat?: string;
  tgl_surat_masuk?: string;
  tgl_masuk?: string;
  tgl_masuk_surat?: string;
  tgl_terima_surat?: string;
  tgl_diteruskan?: string;
  tgl_surat_turun?: string;
  tgl_penyelesaian?: string;
  tgl_keluar?: string;

  // Konten
  lampiran?: string;
  raw_ocr_text?: string;

  // Pihak terkait
  asal_surat?: string;
  kepada?: string;
  tujuan?: string;
  diperuntukan?: string;
  pengolah?: string;

  // Disposisi & Catatan
  disposisi_ketua?: string;
  disposisi_sekwan?: string;
  catatan?: string;
  keterangan?: string;

  // Legacy
  tingkat_keamanan?: string;
  nomor_register?: string;
}

// ==================== PAGINATION ====================
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// ==================== API RESPONSE ====================
export interface ApiResponse<T> {
  status: ProcessingStatus;
  data?: T;
  message?: string;
  code?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  status: "success";
  data: T[];
  pagination: Pagination;
}

// ==================== MENU ITEMS ====================
export interface MenuItem {
  name: string;
  href: string;
  icon: string;
  active?: boolean;
}

// ==================== KODE KANDIDAT ====================
export interface KodeCandidate {
  kode: string;
  keterangan: string;
  confidence: number;
  reasoning?: string;
}

// ==================== EXTRACTED DATA ====================
export interface ExtractedData {
  nomor_surat?: string;
  asal_surat?: string;
  tgl_surat?: string;
  isi_ringkas?: string;
  diperuntukan?: string;
  tingkat_keamanan?: string;
  kepada?: string;
  pengolah?: string;
  tgl_terima_surat?: string;
  nomor_register?: string;
  raw_ocr_text?: string;
}

// ==================== PROCESS SURAT RESPONSE ====================
export interface ProcessSuratResponse {
  status: ProcessingStatus;
  surat_id: string;
  kategori: KategoriSurat;
  processing_time_ms: number;
  steps_completed: string[];
  extracted_data: ExtractedData;
  isi_ringkas?: string;
  isi_ringkas_confidence?: number;
  confidence: {
    overall: number;
    breakdown: Record<string, number>;
    note?: string;
  };
  requires_manual_review: boolean;
  low_confidence_fields: string[];
  gemini_api_usage: {
    ocr_tokens: number;
    summarization_tokens: number;
    auto_fill_tokens: number;
    total_input_tokens: number;
    total_output_tokens: number;
    estimated_cost_usd: number;
  };
  kode_candidates?: KodeCandidate[] | null;
  message?: string;
  fallback_reason?: string;
  steps_failed?: string[];
}

// ==================== VERIFY REQUEST/RESPONSE ====================
export interface VerifyRequest {
  surat_id: string;
  extracted_data: Record<string, unknown>;
  kode_arsip?: string;
}

export interface VerifyResponse {
  status: "success";
  surat_id: string;
  nomor_urut_display: string;
  message: string;
}
