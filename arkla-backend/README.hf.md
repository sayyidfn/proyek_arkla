---
title: ARKLA Backend API
emoji: 📄
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# ARKLA Backend API

Backend API untuk sistem manajemen arsip surat ARKLA.

## Features
- 📄 OCR dengan Google Gemini AI
- 🔍 Ekstraksi data otomatis
- 📊 Klasifikasi surat
- 💾 Database SQLite

## API Endpoints
- `GET /api/v1/health` - Health check
- `POST /api/v1/process-surat` - Process document with OCR
- `GET /api/v1/surat` - Get list of documents
- `POST /api/v1/surat/{id}/verify` - Verify extracted data

## Environment Variables
Set `GOOGLE_API_KEY` in Space Settings → Secrets
