# ARKLA - Sistem Arsip Kedinasan Lainnya

[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

Sistem manajemen arsip digital untuk DPRD Kabupaten Sleman dengan fitur OCR dan AI-powered data extraction menggunakan Google Gemini.

![ARKLA Dashboard](docs/dashboard-preview.png)

## 📋 Fitur Utama

- **📄 OCR & AI Extraction** - Upload dokumen (PDF/JPG/PNG) dan ekstrak data otomatis menggunakan Google Gemini
- **📁 6 Kategori Surat** - Masuk Biasa, Undangan, Masuk Penting, Keluar Dewan, Keluar Sekwan, Rahasia
- **🔍 Pencarian & Filter** - Cari berdasarkan kode arsip, tanggal, isi ringkas
- **📊 Dashboard Statistik** - Monitoring jumlah arsip, pending review, akurasi AI
- **📥 Export Data** - Export ke Excel/CSV sesuai format DPRD
- **🖨️ Cetak Disposisi** - Generate lembar disposisi siap cetak

## 🛠️ Tech Stack

### Backend

- **Framework**: FastAPI (Python 3.12)
- **Database**: SQLite
- **AI/ML**: Google Gemini API (gemini-2-flash)
- **Image Processing**: OpenCV (headless), Pillow

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Hooks

### Deployment

- **Backend**: Koyeb (Docker)
- **Frontend**: Vercel
- **Repository**: GitHub

## 📦 Struktur Proyek

```
proyek_arkla/
├── arkla-backend/           # FastAPI Backend
│   ├── app/
│   │   ├── core/            # Config, database, utilities
│   │   ├── models/          # Pydantic schemas
│   │   ├── routes/          # API endpoints
│   │   └── services/        # Business logic (Gemini, OCR)
│   ├── database/            # SQLite database
│   ├── uploads/             # Uploaded files
│   └── requirements.txt
│
├── arkla-frontend/          # Next.js Frontend
│   ├── src/
│   │   ├── app/             # Pages (App Router)
│   │   ├── components/      # React components
│   │   └── lib/             # API client, types, utils
│   └── package.json
│
├── Dockerfile               # Production Docker config
├── .dockerignore
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Google Gemini API Key

### 1. Clone Repository

```bash
git clone https://github.com/sayyidfn/proyek_arkla.git
cd proyek_arkla
```

### 2. Setup Backend

```bash
cd arkla-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# atau
.\venv\Scripts\Activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env dan tambahkan GOOGLE_API_KEY

# Run server
python run.py
```

Backend akan berjalan di `http://localhost:8000`

### 3. Setup Frontend

```bash
cd arkla-frontend

# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

## ⚙️ Environment Variables

### Backend (.env)

```env
# Required
GOOGLE_API_KEY=your_gemini_api_key_here

# Optional
ENVIRONMENT=development
DATABASE_PATH=database/arkla.db
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📚 API Documentation

API documentation tersedia di:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Main Endpoints

| Method   | Endpoint                | Description                  |
| -------- | ----------------------- | ---------------------------- |
| `POST`   | `/api/v1/process-surat` | Upload & process document    |
| `POST`   | `/api/v1/verify`        | Verify & save extracted data |
| `GET`    | `/api/v1/surat`         | List all surat with filters  |
| `GET`    | `/api/v1/surat/{id}`    | Get surat detail             |
| `DELETE` | `/api/v1/surat/{id}`    | Delete surat                 |
| `POST`   | `/api/v1/export`        | Export to Excel/CSV          |
| `GET`    | `/health`               | Health check                 |

### Process Surat Request

```bash
curl -X POST "http://localhost:8000/api/v1/process-surat" \
  -F "file=@document.jpg" \
  -F "category_id=masuk_biasa" \
  -F "use_optimized=true"
```

### Response Example

```json
{
  "status": "success",
  "surat_id": "abc-123-def",
  "extracted_data": {
    "nomor_surat": "001/DPRD/2026",
    "tgl_surat": "2026-02-01",
    "asal_surat": "Pemerintah Kabupaten Sleman",
    "isi_ringkas": "Undangan rapat koordinasi..."
  },
  "confidence": {
    "overall": 0.85,
    "fields": {
      "nomor_surat": 0.95,
      "tgl_surat": 0.9
    }
  }
}
```

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t arkla-backend .
```

### Run Container

```bash
docker run -d \
  -p 8000:8000 \
  -e GOOGLE_API_KEY=your_key \
  -e ENVIRONMENT=production \
  arkla-backend
```

## ☁️ Cloud Deployment

### Backend (Koyeb)

1. Fork/push repository ke GitHub
2. Buat project di [Koyeb](https://koyeb.com)
3. Connect GitHub repository
4. Set environment variable: `GOOGLE_API_KEY`
5. Deploy!

### Frontend (Vercel)

1. Import project dari GitHub di [Vercel](https://vercel.com)
2. Set `Root Directory` ke `arkla-frontend`
3. Add environment variable: `NEXT_PUBLIC_API_URL` = URL backend Koyeb
4. Deploy!

## 📊 Kategori Surat

| Kategori        | Deskripsi                | Fields Utama                                  |
| --------------- | ------------------------ | --------------------------------------------- |
| `masuk_biasa`   | Surat masuk biasa        | nomor_surat, asal_surat, tgl_surat, disposisi |
| `undangan`      | Undangan rapat/acara     | tgl_acara, tempat, diperuntukan               |
| `masuk_penting` | Surat masuk prioritas    | disposisi_ketua, tgl_diteruskan               |
| `keluar`        | Surat keluar Dewan       | kepada, pengolah                              |
| `keluar_sekwan` | Surat keluar Sekretariat | kepada, pengolah                              |
| `rahasia`       | Surat rahasia            | audit_log enabled                             |

## 🔒 Security

- CORS configured for production domains
- Input validation & sanitization
- File type & size validation
- SQL injection prevention (parameterized queries)
- Audit logging for sensitive documents

## 🧪 Testing

```bash
# Backend tests
cd arkla-backend
pytest

# Frontend tests
cd arkla-frontend
npm test
```

## 📈 Performance Optimizations

- **Image Preprocessing**: Auto-resize & optimize before OCR
- **Database Indexing**: Indexes on frequently queried columns
- **Response Caching**: OCR cache to avoid re-processing
- **Lazy Loading**: Frontend components loaded on demand
- **Docker Layer Caching**: Optimized Dockerfile for faster builds

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 👥 Authors

- **Sayyid Fakhri** - _Initial work_ - [sayyidfn](https://github.com/sayyidfn)

## 🙏 Acknowledgments

- DPRD Kabupaten Sleman
- Google Gemini AI Team
- FastAPI & Next.js Communities

---

<p align="center">
  Made with ❤️ for DPRD Kabupaten Sleman
</p>
