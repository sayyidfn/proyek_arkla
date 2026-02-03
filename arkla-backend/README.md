# ARKLA Backend - FastAPI Documentation

RESTful API untuk sistem arsip DPRD Sleman dengan integrasi Google Gemini AI.

## 🔧 Setup Development

### Requirements

- Python 3.12+
- Google Gemini API Key

### Installation

```bash
# Clone & setup
git clone https://github.com/sayyidfn/proyek_arkla.git
cd proyek_arkla/arkla-backend

# Virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Environment setup
cp .env.example .env
# Edit .env dengan API key Anda
```

### Environment Variables

```env
# Google Gemini
GOOGLE_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true
ENVIRONMENT=development

# Database
DATABASE_PATH=database/arkla.db

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Run Development Server

```bash
python run.py
# atau
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API akan tersedia di:

- **Local**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/api/v1/health

## 📁 Struktur Kode

```
app/
├── core/
│   ├── config.py        # Environment & settings
│   ├── constants.py     # Constants & enums
│   ├── database.py      # SQLite setup & migrations
│   └── utils.py         # Helper functions
├── models/
│   └── schemas.py       # Pydantic models
├── routes/
│   ├── process.py       # Upload & OCR processing
│   ├── surat.py         # CRUD operations
│   ├── export.py        # Data export
│   └── master_data.py   # Kode arsip management
├── services/
│   ├── gemini_engine.py     # Google Gemini integration
│   ├── image_preprocessor.py # Image enhancement
│   ├── text_summarizer.py   # Text summarization
│   ├── auto_filler.py       # Field extraction
│   └── kode_matcher.py      # Archive code matching
└── main.py              # FastAPI app initialization
```

## 🚀 API Endpoints

### Core Processing

```http
POST /api/v1/process-surat
Content-Type: multipart/form-data

file: [PDF/JPG/PNG file]
category_id: string (masuk_biasa|undangan|masuk_penting|keluar|keluar_sekwan|rahasia)
use_optimized: boolean (default: true)
skip_preprocessing: boolean (default: false)
```

### CRUD Operations

```http
# List surat with filters
GET /api/v1/surat?kategori=undangan&page=1&limit=20

# Get surat detail
GET /api/v1/surat/{surat_id}

# Verify & save extracted data
POST /api/v1/verify
{
  "surat_id": "uuid",
  "extracted_data": {...},
  "kode_arsip": "005"
}

# Delete surat
DELETE /api/v1/surat/{surat_id}
```

### Export & Reports

```http
# Export to Excel/CSV
POST /api/v1/export
{
  "kategori": "masuk_biasa",
  "date_from": "2024-01-01",
  "date_to": "2024-12-31",
  "format": "xlsx"
}

# Download file
GET /api/v1/download/{filename}
```

### Utilities

```http
# Health check
GET /api/v1/health

# Preview disposisi (HTML)
GET /api/v1/preview-disposisi/{surat_id}
```

## 🗄️ Database Schema

### Primary Tables

```sql
-- Main surat table
CREATE TABLE surat (
    id TEXT PRIMARY KEY,
    kategori TEXT NOT NULL,
    nomor_urut_display TEXT,
    kode_arsip TEXT,
    raw_ocr_text TEXT,
    isi_ringkas TEXT,
    overall_confidence REAL,
    requires_manual_review INTEGER DEFAULT 0,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Category-specific tables
CREATE TABLE surat_masuk_biasa (
    surat_id TEXT PRIMARY KEY,
    nomor_surat TEXT,
    asal_surat TEXT,
    tgl_surat DATE,
    -- ... other fields
    FOREIGN KEY (surat_id) REFERENCES surat(id)
);

-- Similar tables for: undangan, masuk_penting, keluar, keluar_sekwan, rahasia
```

## 🤖 AI Processing Pipeline

### 1. OCR Extraction (Gemini Vision)

```python
# Extract text from document images
result = gemini_engine.extract_text(image_path)
```

### 2. Data Extraction (Gemini)

```python
# Extract structured fields
fields = gemini_engine.extract_fields(
    raw_text=ocr_result,
    kategori="masuk_biasa"
)
```

### 3. Text Summarization (Gemini)

```python
# Generate summary
summary = gemini_engine.summarize_text(
    text=ocr_result,
    kategori="undangan"
)
```

### 4. Confidence Scoring

```python
# Calculate field confidence
confidence = {
    "overall": 0.85,
    "breakdown": {
        "nomor_surat": 0.95,
        "asal_surat": 0.75,
        "tgl_surat": 0.90
    }
}
```

## 🔒 Security

### Authentication

Saat ini menggunakan CORS untuk security. Production deployment memerlukan:

- API Key authentication
- Rate limiting
- Request validation

### Data Protection

- SQL injection prevention (parameterized queries)
- File type validation
- File size limits (50MB max)
- Sanitized file names

## 📊 Monitoring & Logging

### Logging Levels

```python
# Production logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Key events logged:
# - OCR processing start/end
# - API errors and exceptions
# - Database operations
# - Gemini API usage & costs
```

### Health Monitoring

```http
GET /api/v1/health
{
    "status": "healthy",
    "environment": "production",
    "database": "connected",
    "gemini_configured": true,
    "version": "1.0.0"
}
```

## 🚀 Deployment

### Hugging Face Spaces (Production)

```dockerfile
# Dockerfile.hf
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
```

### Environment Setup

```bash
# Production environment variables
GOOGLE_API_KEY=prod_api_key
ENVIRONMENT=production
DEBUG=false
```

## 🧪 Testing

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:8000/api/v1/health

# Test file upload
curl -X POST \
  -F "file=@test.jpg" \
  -F "category_id=masuk_biasa" \
  http://localhost:8000/api/v1/process-surat
```

### Error Handling

API menggunakan standar HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid input)
- `404` - Not Found
- `422` - Unprocessable Entity (OCR failed)
- `500` - Internal Server Error

## 📝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 🔗 Links

- **Live API**: https://sayyidfn-arkla-backend.hf.space
- **API Docs**: https://sayyidfn-arkla-backend.hf.space/docs
- **Frontend**: https://proyekarkla.vercel.app
- **Repository**: https://github.com/sayyidfn/proyek_arkla
