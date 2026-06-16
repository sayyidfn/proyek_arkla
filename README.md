# ARKLA - Sistem Arsip Kedinasan DPRD Sleman

[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://sayyidfn-arkla-backend.hf.space/docs)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-000000?style=flat-square&logo=next.js)](https://proyekarkla.vercel.app)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini%202.5-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Deployment-Docker%20%26%20HF%20Spaces-2496ED?style=flat-square&logo=docker)](https://huggingface.co/spaces)

ARKLA adalah sistem manajemen arsip surat dinas digital terintegrasi yang dirancang khusus untuk DPRD Kabupaten Sleman. Sistem ini menggunakan teknologi **OCR (Optical Character Recognition)** dan **AI Extraction** berbasis **Google Gemini API** untuk membaca, mengekstraksi, dan mengkategorikan isi surat secara otomatis guna mengurangi beban kerja input manual dan meningkatkan efisiensi administrasi.

---

## ⚡ Live Demo

- **Frontend App**: [proyekarkla.vercel.app](https://proyekarkla.vercel.app)
- **Backend API Documentation**: [sayyidfn-arkla-backend.hf.space/docs](https://sayyidfn-arkla-backend.hf.space/docs)

---

## 🎯 Fitur Utama

| Fitur | Deskripsi |
| --- | --- |
| 📄 **OCR & AI Extraction** | Unggah dokumen (PDF, JPG, PNG) untuk diekstrak isi dan metadata suratnya secara otomatis menggunakan Gemini AI. |
| 📁 **6 Kategori Surat** | Klasifikasi surat ke dalam kategori spesifik: *Masuk Biasa, Undangan, Masuk Penting, Keluar, Keluar Sekwan,* dan *Rahasia*. |
| 🔍 **Pencarian & Filter** | Pencarian cepat berbasis teks, rentang tanggal, kode klasifikasi arsip, atau kategori surat. |
| 📊 **Dashboard Statistik** | Monitor jumlah arsip masuk/keluar, status tinjauan manual, dan kalkulasi estimasi penggunaan API. |
| 📥 **Ekspor Laporan** | Mengunduh rekapitulasi data arsip dalam format Excel (.xlsx) atau CSV sesuai standar format DPRD. |
| 🖨️ **Cetak Lembar Disposisi** | Menghasilkan berkas cetak lembar disposisi dinamis dengan format standar A5. |
| 🔒 **Security & Audit Logs** | Keamanan data sensitif dengan sistem autentikasi JWT, validasi file, CORS, dan log audit khusus untuk kategori *Rahasia*. |

---

## 🛠️ Tech Stack

### Backend
- **Core Framework**: FastAPI (Python 3.12+)
- **Database**: SQLite (SQLAlchemy / direct sqlite3 connection)
- **AI Integration**: Google Gemini API (`gemini-2.5-flash` untuk pemrosesan teks cepat & efisien)
- **Image Preprocessing**: OpenCV & Pillow (untuk optimalisasi kontras gambar sebelum OCR)
- **Deployment**: Docker & Hugging Face Spaces

### Frontend
- **Framework**: Next.js 16.1.x (App Router & TypeScript 5)
- **Library**: React 19.2.x
- **Styling**: Tailwind CSS v4.x (dengan `@tailwindcss/postcss`)
- **Authentication**: JWT & Cookie-based sessions (jose)
- **Deployment**: Vercel

---

## 📁 Struktur Repositori

```text
proyek_arkla/
├── arkla-backend/          # Backend Service (FastAPI)
│   ├── app/
│   │   ├── core/           # Konfigurasi, Database, Utilitas, & Auth
│   │   ├── models/         # Pydantic schemas untuk validasi request/response
│   │   ├── routes/         # Router API (Auth, Process OCR, Surat CRUD, Export, Master)
│   │   ├── services/       # Logika bisnis AI (Gemini, OCR, Auto-fill, Matcher)
│   │   └── main.py         # Entrypoint aplikasi FastAPI
│   ├── database/           # Penyimpanan berkas SQLite (.db)
│   ├── uploads/            # Direktori sementara penyimpanan file unggahan
│   ├── requirements.txt    # Daftar dependensi Python
│   └── run.py              # Script untuk menjalankan backend lokal
│
├── arkla-frontend/         # Frontend Service (Next.js)
│   ├── src/
│   │   ├── app/            # Halaman utama & layout Next.js (App Router)
│   │   ├── components/     # Komponen React (Shared, Archive, Upload, Export)
│   │   ├── hooks/          # React hooks kustom (useArchive, useUpload, dll.)
│   │   └── lib/            # HTTP client API & TypeScript types
│   ├── public/             # Aset statis (ikon, gambar)
│   └── package.json        # Dependensi dan script NPM
│
├── Dockerfile              # Konfigurasi Docker multi-stage untuk Hugging Face Spaces
├── .dockerignore           # Daftar file yang dikecualikan dari Docker build
└── README.md               # Dokumentasi utama proyek (file ini)
```

---

## 🚀 Quick Start & Setup Lokal

### Prasyarat System
- Python 3.12 atau lebih baru
- Node.js 18 atau lebih baru (NPM v9+)
- Akun Google AI Studio untuk mendapatkan **Gemini API Key**

---

### 1. Setup Backend (FastAPI)

1. Masuk ke direktori backend:
   ```bash
   cd arkla-backend
   ```

2. Buat dan aktifkan virtual environment Python:
   ```bash
   # Windows (PowerShell/CMD)
   python -m venv venv
   .\venv\Scripts\activate

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Instal semua dependensi Python:
   ```bash
   pip install -r requirements.txt
   ```

4. Konfigurasi file `.env`:
   Salin berkas `.env.example` menjadi `.env` dan masukkan konfigurasi Anda:
   ```bash
   cp .env.example .env
   ```
   Pastikan minimal mengisi parameter berikut:
   ```env
   GOOGLE_API_KEY=isi_dengan_api_key_gemini_anda
   GEMINI_MODEL=gemini-2.5-flash
   ENVIRONMENT=development
   SECRET_KEY=masukkan_32_karakter_acak_untuk_jwt_secret
   JWT_SECRET=masukkan_32_karakter_acak_untuk_jwt_secret
   ```

5. Jalankan server backend lokal:
   ```bash
   python run.py
   ```
   Server backend akan aktif di `http://localhost:8000`. Anda dapat mengakses dokumentasi API interaktif di `http://localhost:8000/docs`.

---

### 2. Setup Frontend (Next.js)

1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd arkla-frontend
   ```

2. Instal dependensi Node.js:
   ```bash
   npm install
   ```

3. Konfigurasi file `.env.local`:
   Buat file `.env.local` di dalam direktori `arkla-frontend/` dan isi dengan:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   JWT_SECRET=samakan_dengan_jwt_secret_di_backend_env
   ```

4. Jalankan server development frontend:
   ```bash
   npm run dev
   ```
   Aplikasi frontend akan aktif dan dapat diakses di `http://localhost:3000`.

---



## 📚 API Endpoint Utama

| Method | Endpoint | Deskripsi | Autentikasi |
| :---: | :--- | :--- | :---: |
| **POST** | `/api/v1/auth/login` | Autentikasi pengguna & pembuatan session cookie | Tidak |
| **POST** | `/api/v1/process-surat` | Unggah berkas dokumen (PDF/JPG/PNG) & ekstraksi AI | Ya |
| **POST** | `/api/v1/verify` | Menyimpan & memverifikasi hasil ekstraksi data surat | Ya |
| **GET** | `/api/v1/surat` | Mengambil daftar surat terarsipkan dengan pagination & filter | Ya |
| **GET** | `/api/v1/surat/{id}` | Mengambil detail lengkap informasi satu surat | Ya |
| **POST** | `/api/v1/export` | Ekspor rekapitulasi data arsip surat ke format Excel/CSV | Ya |
| **GET** | `/api/v1/preview-disposisi/{id}` | Menghasilkan format HTML pratinjau lembar disposisi | Ya |
| **DELETE** | `/api/v1/surat/{id}` | Menghapus arsip surat beserta data kategorinya | Ya |
| **GET** | `/api/v1/health` | Status kesehatan konektivitas database & integrasi Gemini | Tidak |

---

## 🐳 Panduan Deployment

### Backend (Hugging Face Spaces)
Repositori ini telah dilengkapi dengan `Dockerfile` di root untuk melakukan deployment backend FastAPI secara langsung ke Hugging Face Spaces berbasis Docker:
```bash
# Build image Docker lokal
docker build -t arkla-backend .

# Menjalankan container dengan port forwarding
docker run -d -p 7860:7860 -e GOOGLE_API_KEY=api_key_anda arkla-backend
```

### Frontend (Vercel)
Layanan frontend dapat di-deploy dengan mudah ke Vercel dengan menyambungkan repositori GitHub Anda ke dashboard Vercel, mengatur root directory ke `arkla-frontend`, serta memasukkan *Environment Variables* berikut:
- `NEXT_PUBLIC_API_URL` (Mengarah ke domain backend Hugging Face Spaces Anda, contoh: `https://sayyidfn-arkla-backend.hf.space/api/v1`)
- `JWT_SECRET` (JWT Token Signature yang sama dengan backend)

---
