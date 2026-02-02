# Deployment Guide

## 🚀 Overview

ARKLA terdiri dari 2 komponen:

1. **Backend** (FastAPI) - Deploy ke Koyeb
2. **Frontend** (Next.js) - Deploy ke Vercel

---

## 📋 Prerequisites

1. GitHub account dengan repository ARKLA
2. Google Gemini API Key dari [AI Studio](https://aistudio.google.com/app/apikey)
3. Akun di [Koyeb](https://koyeb.com) (gratis)
4. Akun di [Vercel](https://vercel.com) (gratis)

---

## 🐳 Backend Deployment (Koyeb)

### Step 1: Prepare Repository

Pastikan file berikut ada di root repository:

```
Dockerfile
.dockerignore
arkla-backend/
  requirements.txt
  app/
```

### Step 2: Create Koyeb Account

1. Buka [app.koyeb.com](https://app.koyeb.com)
2. Sign up dengan GitHub

### Step 3: Create New Service

1. Klik **"Create Service"**
2. Pilih **"GitHub"** sebagai source
3. Authorize Koyeb untuk akses repository
4. Pilih repository `proyek_arkla`

### Step 4: Configure Build

- **Branch**: `main`
- **Builder**: `Dockerfile`
- **Dockerfile location**: `Dockerfile` (root)

### Step 5: Configure Service

- **Instance type**: Free tier (nano)
- **Region**: Washington D.C. (atau terdekat)
- **Port**: 8000

### Step 6: Environment Variables

Tambahkan environment variable:

| Name             | Value               |
| ---------------- | ------------------- |
| `GOOGLE_API_KEY` | Your Gemini API key |
| `ENVIRONMENT`    | `production`        |

### Step 7: Deploy

1. Klik **"Deploy"**
2. Tunggu build selesai (~3-5 menit)
3. Catat URL service (contoh: `https://arkla-xxxxx.koyeb.app`)

### Step 8: Verify

```bash
curl https://your-service.koyeb.app/health
```

Response:

```json
{ "status": "healthy", "gemini_configured": true, "database": "connected" }
```

---

## ⚡ Frontend Deployment (Vercel)

### Step 1: Import Project

1. Buka [vercel.com/new](https://vercel.com/new)
2. Klik **"Import Git Repository"**
3. Pilih repository `proyek_arkla`

### Step 2: Configure Project

- **Framework Preset**: Next.js
- **Root Directory**: `arkla-frontend`
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)

### Step 3: Environment Variables

Tambahkan:

| Name                  | Value                              |
| --------------------- | ---------------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://your-koyeb-url.koyeb.app` |

⚠️ **Penting**: Jangan tambahkan `/api/v1` - frontend akan otomatis menambahkannya.

### Step 4: Deploy

1. Klik **"Deploy"**
2. Tunggu build selesai (~1-2 menit)
3. Akses URL yang diberikan

---

## 🔄 Auto-Deploy

Setelah setup selesai, setiap push ke `main` branch akan trigger:

- **Koyeb**: Auto-rebuild backend
- **Vercel**: Auto-rebuild frontend

---

## 🔧 Troubleshooting

### Backend: "libxcb.so.1 not found"

**Penyebab**: opencv-python membutuhkan GUI libraries
**Solusi**: Pastikan `opencv-python-headless` di requirements.txt, bukan `opencv-python`

### Backend: "Package not found"

**Penyebab**: Debian package name berubah
**Solusi**: Gunakan `libgl1` bukan `libgl1-mesa-glx` di Dockerfile

### Frontend: "API Error 404"

**Penyebab**: URL backend salah atau tidak ada `/api/v1`
**Solusi**:

1. Pastikan `NEXT_PUBLIC_API_URL` benar
2. Redeploy frontend setelah update env variable

### Frontend: URL terlihat salah (gabungan Vercel + Koyeb)

**Penyebab**: `NEXT_PUBLIC_API_URL` tidak ada `https://`
**Solusi**: Tambahkan `https://` di depan URL

---

## 📊 Monitoring

### Koyeb Dashboard

- View logs: Service → Logs
- View metrics: Service → Metrics
- Restart: Service → Redeploy

### Vercel Dashboard

- View logs: Deployments → Functions
- View analytics: Analytics tab
- Redeploy: Deployments → ... → Redeploy

---

## 💰 Cost Estimate

| Service | Free Tier Limit | Expected Usage |
| ------- | --------------- | -------------- |
| Koyeb   | 1 nano instance | ✅ Sufficient  |
| Vercel  | 100GB bandwidth | ✅ Sufficient  |
| Gemini  | 15 RPM, $0      | ✅ Free tier   |

---

## 🔐 Security Checklist

- [x] GOOGLE_API_KEY tidak di-commit ke repository
- [x] CORS dikonfigurasi untuk production
- [x] Environment variables di-set sebagai secret
- [x] HTTPS enabled (otomatis di Koyeb & Vercel)

---

## 📞 Support

Jika mengalami masalah:

1. Check logs di Koyeb/Vercel dashboard
2. Verify environment variables
3. Test health endpoint: `GET /health`
4. Buka issue di GitHub repository
