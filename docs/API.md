# API Endpoints Documentation

## Base URL
- Local: `http://localhost:8000/api/v1`
- Production: `https://your-koyeb-url.koyeb.app/api/v1`

---

## 📄 Process Surat

### POST `/process-surat`
Upload and process a document using OCR and AI extraction.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file` (required): Document file (PDF, JPG, PNG)
  - `category_id` (required): One of `masuk_biasa`, `undangan`, `masuk_penting`, `keluar`, `keluar_sekwan`, `rahasia`
  - `use_optimized` (optional): Boolean, default `true`

**Response (Success):**
```json
{
  "status": "success",
  "surat_id": "abc123-def456-ghi789",
  "extracted_data": {
    "nomor_surat": "001/DPRD/I/2026",
    "tgl_surat": "2026-01-15",
    "asal_surat": "Pemerintah Kabupaten Sleman",
    "isi_ringkas": "Undangan rapat koordinasi pembangunan",
    "lampiran": "1 berkas"
  },
  "confidence": {
    "overall": 0.85,
    "requires_manual_review": false,
    "fields": {
      "nomor_surat": 0.95,
      "tgl_surat": 0.90,
      "asal_surat": 0.85,
      "isi_ringkas": 0.80
    }
  },
  "gemini_usage": {
    "input_tokens": 1500,
    "output_tokens": 200,
    "estimated_cost_usd": 0.0017
  },
  "processing_time_ms": 3500
}
```

**Error Codes:**
- `INVALID_CATEGORY`: Invalid category provided
- `INVALID_FILE`: Unsupported file format
- `FILE_TOO_LARGE`: File exceeds 50MB limit
- `OCR_FAILED`: Image processing failed
- `GEMINI_CONFIG_ERROR`: API key not configured
- `GEMINI_RATE_LIMIT`: Rate limit exceeded

---

## ✅ Verify Surat

### POST `/verify`
Verify and save extracted data after user review.

**Request:**
```json
{
  "surat_id": "abc123-def456-ghi789",
  "extracted_data": {
    "nomor_surat": "001/DPRD/I/2026",
    "tgl_surat": "2026-01-15",
    "asal_surat": "Pemerintah Kabupaten Sleman",
    "isi_ringkas": "Undangan rapat koordinasi"
  },
  "kode_arsip": "010.1"
}
```

**Response:**
```json
{
  "surat_id": "abc123-def456-ghi789",
  "nomor_urut_display": "0001/MASUK_BIASA/2026",
  "message": "Surat berhasil disimpan"
}
```

---

## 📋 List Surat

### GET `/surat`
Get list of all surat with pagination and filters.

**Query Parameters:**
- `kategori` (optional): Filter by category
- `date_from` (optional): Start date (YYYY-MM-DD)
- `date_to` (optional): End date (YYYY-MM-DD)
- `kode` (optional): Filter by kode arsip
- `search` (optional): Search in isi_ringkas
- `include_unverified` (optional): Include unverified surat (default: false)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "abc123",
      "kategori": "masuk_biasa",
      "nomor_urut_display": "0001/MASUK_BIASA/2026",
      "kode_arsip": "010.1",
      "isi_ringkas": "Undangan rapat koordinasi",
      "overall_confidence": 0.85,
      "requires_manual_review": false,
      "verified_at": "2026-01-15T10:30:00",
      "created_at": "2026-01-15T10:00:00",
      "asal_surat": "Pemerintah Kabupaten Sleman"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

## 📝 Get Surat Detail

### GET `/surat/{surat_id}`
Get detailed information about a specific surat.

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "abc123",
    "kategori": "masuk_biasa",
    "nomor_urut_display": "0001/MASUK_BIASA/2026",
    "kode_arsip": "010.1",
    "raw_ocr_text": "Full OCR text...",
    "isi_ringkas": "Undangan rapat koordinasi",
    "nomor_surat": "001/DPRD/I/2026",
    "tgl_surat": "2026-01-15",
    "asal_surat": "Pemerintah Kabupaten Sleman",
    "lampiran": "1 berkas",
    "pengolah": "Bagian Umum",
    "disposisi_ketua": "Untuk ditindaklanjuti",
    "overall_confidence": 0.85,
    "verified_at": "2026-01-15T10:30:00",
    "created_at": "2026-01-15T10:00:00"
  }
}
```

---

## 🗑️ Delete Surat

### DELETE `/surat/{surat_id}`
Delete a surat and all related data.

**Response:**
```json
{
  "status": "success",
  "message": "Surat deleted successfully"
}
```

---

## 📊 Export

### POST `/export`
Export surat data to Excel or CSV.

**Query Parameters:**
- `kategori` (required): Category to export
- `date_from` (optional): Start date
- `date_to` (optional): End date
- `include_unverified` (optional): Include unverified
- `format` (optional): `xlsx` or `csv` (default: xlsx)

**Response:**
```json
{
  "status": "success",
  "file_url": "/api/v1/download/export_masuk_biasa_20260115.xlsx",
  "filename": "export_masuk_biasa_20260115.xlsx",
  "record_count": 50
}
```

---

## ❤️ Health Check

### GET `/health`
Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "gemini_configured": true,
  "database": "connected",
  "version": "1.0.0"
}
```

---

## 🔴 Error Response Format

All error responses follow this format:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human readable error message",
  "timestamp": "2026-01-15T10:00:00.000Z",
  "surat_id": "abc123",
  "details": {
    "additional": "info"
  }
}
```

---

## 📊 Field Schemas by Category

### masuk_biasa
- nomor_urut, index_surat, kode, tgl_surat, isi_ringkas
- asal_surat, nomor_surat, lampiran, pengolah
- tgl_diteruskan, disposisi_ketua, tgl_masuk, tujuan
- tgl_surat_turun, disposisi_sekwan

### undangan
- nomor_urut, index_surat, kode, tgl_surat_masuk, tgl_penyelesaian
- isi_ringkas, asal_surat, nomor_surat, lampiran, keterangan
- tgl_masuk_surat, diperuntukan, tgl_surat_turun, disposisi_sekwan

### masuk_penting
- nomor_urut, index_surat, kode, tgl_surat_masuk, isi_ringkas
- asal_surat, nomor_surat, lampiran, pengolah, tgl_diteruskan
- disposisi_ketua, tgl_masuk, tujuan, tgl_surat_turun, disposisi_sekwan

### keluar / keluar_sekwan
- nomor_urut, index_surat, kode, isi_ringkas
- kepada, pengolah, tgl_surat, lampiran, catatan

### rahasia
- nomor_urut, index_surat, kode, tgl_terima_surat, isi_ringkas
- asal_surat, nomor_surat, lampiran, pengolah
- tgl_diteruskan, catatan
- *Note: All actions are logged in audit_log table*
