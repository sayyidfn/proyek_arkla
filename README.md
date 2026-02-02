# ARKLA - Sistem Arsip Kedinasan DPRD Sleman

[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://sayyidfn-arkla-backend.hf.space/docs)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js-000000?style=flat-square&logo=next.js)](https://proyekarkla.vercel.app)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)

> Sistem manajemen arsip digital dengan OCR dan AI extraction menggunakan Google Gemini API

## ⚡ Live Demo

- **Frontend**: [proyekarkla.vercel.app](https://proyekarkla.vercel.app)
- **Backend API**: [sayyidfn-arkla-backend.hf.space](https://sayyidfn-arkla-backend.hf.space/docs)

## 🎯 Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 📄 **OCR & AI Extraction** | Upload PDF/JPG/PNG, ekstrak data otomatis dengan Gemini AI |
| 📁 **6 Kategori Surat** | Masuk Biasa, Undangan, Masuk Penting, Keluar, Keluar Sekwan, Rahasia |
| 🔍 **Pencarian & Filter** | Cari berdasarkan kategori, tanggal, kode arsip, atau isi ringkas |
| 📊 **Dashboard Statistik** | Monitor total arsip, pending review, tingkat akurasi AI |
| 📥 **Export Data** | Export ke Excel/CSV dengan format standar DPRD |
| 🖨️ **Lembar Disposisi** | Generate dan cetak lembar disposisi format A5 |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (untuk frontend)
- Python 3.12+ (untuk backend)
- Google Gemini API Key

### 1. Clone Repository
```bash
git clone https://github.com/sayyidfn/proyek_arkla.git
cd proyek_arkla
```

### 2. Setup Backend
```bash
cd arkla-backend
python -m venv venv
venv\Scripts\activate  # Windows
# atau
source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
```

### 3. Environment Variables
Buat file `.env` di folder `arkla-backend/`:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
DEBUG=true
ENVIRONMENT=development
```

### 4. Jalankan Backend
```bash
python run.py
# Server berjalan di http://localhost:8000
```

### 5. Setup Frontend
```bash
cd ../arkla-frontend
npm install
npm run dev
# Frontend berjalan di http://localhost:3000
```

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python 3.12)
- SQLite Database
- Google Gemini API
- OpenCV & Pillow

**Frontend:**
- Next.js 15 + TypeScript
- Tailwind CSS
- React 19

**Deployment:**
- Backend: Hugging Face Spaces
- Frontend: Vercel

## 📁 Struktur Proyek

```
arkla-backend/
├── app/
│   ├── core/          # Configuration & database
│   ├── models/        # Pydantic schemas  
│   ├── routes/        # API endpoints
│   ├── services/      # Business logic
│   └── main.py        # FastAPI app
├── database/          # SQLite files
├── uploads/           # Uploaded files
└── requirements.txt

arkla-frontend/
├── src/
│   ├── app/          # Next.js App Router
│   ├── components/   # React components
│   └── lib/          # Utilities & types
├── public/           # Static assets
└── package.json
```

## 🔧 Konfigurasi

### Environment Variables

**Backend (`.env`):**
```env
# Google Gemini
GOOGLE_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.5-flash

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true
ENVIRONMENT=development

# Database
DATABASE_PATH=database/arkla.db

# CORS (pisah dengan koma)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Frontend (`.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## 📚 API Endpoints

**Core Endpoints:**
- `POST /api/v1/process-surat` - Upload & proses dokumen
- `POST /api/v1/verify` - Verifikasi & simpan data
- `GET /api/v1/surat` - List semua surat
- `GET /api/v1/surat/{id}` - Detail surat
- `POST /api/v1/export` - Export data ke Excel/CSV

**Dokumentasi lengkap:** [Backend API Docs](https://sayyidfn-arkla-backend.hf.space/docs)

## 🔄 Development Workflow

### 1. Menambah Fitur Baru
```bash
# Buat branch baru
git checkout -b feature/nama-fitur

# Development
# ... kode ...

# Test & commit
git add .
git commit -m "feat: tambah fitur baru"
git push origin feature/nama-fitur
```

### 2. Deployment

**Backend ke Hugging Face Spaces:**
- Push ke GitHub (auto-deploy)

**Frontend ke Vercel:**
- Push ke GitHub (auto-deploy)

## 🐛 Troubleshooting

### Backend Issues

**"GOOGLE_API_KEY not configured"**
```bash
# Set environment variable
export GOOGLE_API_KEY="your_api_key"
# atau tambah di file .env
```

**"Module not found"**
```bash
# Install dependencies
pip install -r requirements.txt
```

**Database error**
```bash
# Reset database
rm database/arkla.db
python -c "from app.core.database import init_database; init_database()"
```

### Frontend Issues

**API connection error**
- Cek backend berjalan di port 8000
- Cek `NEXT_PUBLIC_API_URL` di `.env.local`

**Build error**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

MIT License - lihat [LICENSE](LICENSE) untuk detail.

## 👥 Contributors

- **Sayyid Faisal Naufal** - [sayyidfn](https://github.com/sayyidfn)

---

**💡 Tips:**
- Gunakan gambar berkualitas tinggi untuk OCR lebih akurat
- Kategorikan surat dengan benar untuk data yang terstruktur  
- Lakukan verifikasi manual untuk data penting
- Export data secara berkala sebagai backup

**📞 Support:**
Jika ada masalah atau pertanyaan, buat [issue di GitHub](https://github.com/sayyidfn/proyek_arkla/issues).
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
