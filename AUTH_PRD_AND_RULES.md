# AUTH PRD & RULES — ARKLA Authentication System

> **Status**: Menunggu persetujuan sebelum implementasi  
> **Tanggal Dibuat**: 2026-05-28  
> **Versi**: 1.0.0  
> **Dibuat oleh**: Senior Full-Stack Engineer (AI Pair Programmer)

---

## Daftar Isi

1. [Ringkasan Eksekutif & Konteks Proyek](#1-ringkasan-eksekutif--konteks-proyek)
2. [Product Requirements Document (PRD)](#2-product-requirements-document-prd)
3. [Landasan Teknis & Arsitektur](#3-landasan-teknis--arsitektur)
4. [Coding Rules & Safeguards](#4-coding-rules--safeguards)
5. [Daftar File yang Akan Dimodifikasi & Dibuat](#5-daftar-file-yang-akan-dimodifikasi--dibuat)
6. [Rencana Migrasi Database](#6-rencana-migrasi-database)
7. [Checklist Verifikasi Pasca-Implementasi](#7-checklist-verifikasi-pasca-implementasi)

---

## 1. Ringkasan Eksekutif & Konteks Proyek

### 1.1 State of the Codebase (Hasil Analisis)

Setelah analisis menyeluruh terhadap seluruh workspace, berikut adalah kondisi aktual proyek saat ini:

#### Frontend (`arkla-frontend`)
| Aspek | Detail |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| Bahasa | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| State Management | React Context API (`SidebarProvider`) |
| Auth saat ini | **Tidak ada** — semua rute bebas diakses tanpa autentikasi |
| Middleware | **Tidak ada** `middleware.ts` |
| Rute yang ada | `/` (Dashboard), `/upload`, `/archive`, `/archive/[id]` |
| API Layer | Class `APIClient` di `src/lib/api-client.ts` — plain `fetch`, tanpa token header |
| Env Config | `NEXT_PUBLIC_API_URL` → `src/lib/config.ts` |

#### Backend (`arkla-backend`)
| Aspek | Detail |
|---|---|
| Framework | FastAPI (Python) |
| Database | SQLite via `database/arkla.db` |
| ORM/Query | Raw SQL dengan `sqlite3` (context manager `get_db()`) |
| Auth saat ini | **Tidak ada** — semua endpoint publik |
| CORS | `allow_origins=["*"]`, `allow_credentials=True` |
| Tabel DB yang ada | `surat`, `surat_*` (6 kategori), `ref_klasifikasi`, `audit_log`, `ocr_cache`, `api_usage` |
| Dependensi Auth | **Tidak ada** — `python-jose`, `passlib`, `bcrypt` belum ada di `requirements.txt` |
| Router yang ada | `process`, `surat`, `export`, `master_data` |

#### Fitur Kritis yang TIDAK BOLEH Terganggu
1. **Pipeline OCR+LLM**: `POST /api/v1/process-surat` → Gemini AI → ekstraksi data
2. **Sistem Upload**: Multi-step wizard (`SelectCategory → UploadFile → ProcessingOCR → ValidationForm`)
3. **Dashboard statistik**: `getDashboardStats()` → `getRecentSurat()` → `GET /api/v1/surat`
4. **Halaman Archive**: Filter, pagination, dan detail surat (`/archive`, `/archive/[id]`)
5. **Export Excel/CSV**: `POST /api/v1/export`
6. **Lembar Disposisi**: `GET /api/v1/preview-disposisi/{surat_id}`
7. **Master Data**: `GET/POST /api/v1/master-data/...`

---

## 2. Product Requirements Document (PRD)

### 2.1 Tujuan Fitur

Menambahkan sistem autentikasi berbasis **username + password** untuk memproteksi seluruh halaman dashboard ARKLA agar hanya dapat diakses oleh staf DPRD Sleman yang terotorisasi.

### 2.2 Aktor & Peran

| Aktor | Deskripsi |
|---|---|
| **Admin** | Pengelola sistem. Dapat membuat akun pengguna baru, menghapus akun, serta mengakses seluruh fitur |
| **Operator** | Staf input surat harian. Dapat mengakses semua fitur kecuali manajemen user |

> **Catatan**: Role-Based Access Control (RBAC) di fase pertama hanya membedakan `admin` vs `operator`. Perbedaan halaman yang bisa diakses antar role akan diperluas di iterasi berikutnya.

### 2.3 User Stories

#### UC-01: Login
```
SEBAGAI pengguna teregistrasi,
SAYA INGIN dapat login menggunakan username dan password,
AGAR SAYA bisa mengakses dashboard ARKLA.

Acceptance Criteria:
- Form login menampilkan field username dan password
- Tombol "Masuk" memanggil API login
- Jika kredensial salah → tampil pesan error spesifik (jangan expose detail teknis)
- Jika login berhasil → redirect ke halaman dashboard (/)
- Session bertahan selama 8 jam (token tidak expired)
- Terdapat opsi "Ingat Saya" yang memperpanjang session hingga 7 hari
```

#### UC-02: Register / Buat Akun Baru
```
SEBAGAI admin,
SAYA INGIN dapat mendaftarkan akun operator baru,
AGAR operator baru dapat mengakses sistem.

Acceptance Criteria:
- Halaman register hanya bisa diakses oleh Admin (terproteksi)
- Form memiliki field: nama lengkap, username, password, konfirmasi password, dan role
- Username bersifat unik (tidak boleh duplikat)
- Password minimal 8 karakter
- Setelah berhasil register → tampil notifikasi sukses, tidak auto-login
```

#### UC-03: Logout
```
SEBAGAI pengguna yang sedang login,
SAYA INGIN dapat logout,
AGAR sesi saya diakhiri dengan aman.

Acceptance Criteria:
- Tombol Logout tersedia di Sidebar (area profil pengguna, saat ini placeholder "Admin")
- Klik Logout → hapus token dari cookie → redirect ke /login
- Setelah logout, akses kembali ke halaman protected → redirect ke /login
```

#### UC-04: Proteksi Rute (Route Guard)
```
SEBAGAI sistem ARKLA,
SAYA INGIN memastikan semua halaman dashboard hanya dapat diakses oleh
pengguna yang sudah login,
AGAR data arsip DPRD Sleman terlindungi.

Acceptance Criteria:
- Mengakses /, /upload, /archive, /archive/[id] tanpa login → redirect ke /login
- Mengakses /login saat sudah login → redirect ke /
- Token yang expired → otomatis redirect ke /login dengan pesan "Sesi habis, silakan login kembali"
```

#### UC-05: Tampilkan Info Pengguna yang Login
```
SEBAGAI pengguna yang login,
SAYA INGIN melihat nama dan role saya di Sidebar,
AGAR saya tahu identitas akun yang sedang aktif.

Acceptance Criteria:
- Area footer Sidebar yang saat ini menampilkan "Admin" / "DPRD Sleman" (hardcoded)
  akan diganti dengan data dinamis dari token (nama + role)
- Inisial avatar mengikuti huruf pertama nama pengguna
```

### 2.4 Halaman Baru

| Halaman | Path | Akses |
|---|---|---|
| Login | `/login` | Publik (redirect ke `/` jika sudah login) |
| Register | `/register` | Protected — hanya Admin |

### 2.5 Non-Functional Requirements

- **Keamanan**: Password di-hash dengan `bcrypt` (cost factor ≥ 12). Token menggunakan JWT RS256 atau HS256 dengan `SECRET_KEY`.
- **Performa**: Proses login tidak boleh menambah latency lebih dari 200ms ke request API yang sudah ada.
- **Backward Compatibility**: Seluruh endpoint API existing (`/surat`, `/process-surat`, dll.) **TETAP berfungsi normal** selama masa transisi.
- **Tidak ada breaking change**: Tidak ada endpoint yang sebelumnya berfungsi menjadi `401 Unauthorized` tanpa sengaja.

---

## 3. Landasan Teknis & Arsitektur

### 3.1 Strategi Autentikasi yang Dipilih

**JWT (JSON Web Token) berbasis HttpOnly Cookie** — tanpa library eksternal Next-Auth/Auth.js.

**Alasan pemilihan:**
- **Tidak perlu database provider eksternal**: proyek menggunakan SQLite, tidak ada PostgreSQL/MySQL yang dibutuhkan Auth.js.
- **Sederhana & sesuai stack**: Implementasi sendiri lebih mudah dikontrol dan tidak menambah kompleksitas dependensi.
- **HttpOnly Cookie lebih aman dari localStorage**: Token tidak dapat diakses JavaScript (proteksi XSS).
- **CSRF protection built-in**: Dengan `SameSite=Strict` cookie attribute.

### 3.2 Alur Autentikasi (Flow Diagram)

```
[Browser]                    [Next.js Frontend]              [FastAPI Backend]
   |                               |                               |
   |--- GET /dashboard ----------->|                               |
   |                    [middleware.ts checks cookie]              |
   |                    [no token found]                           |
   |<-- redirect /login -----------|                               |
   |                               |                               |
   |--- POST /login (form) ------->|                               |
   |                               |--- POST /api/v1/auth/login -->|
   |                               |                    [validate credentials]
   |                               |                    [generate JWT]
   |                               |<-- { access_token, user } ---|
   |                    [set HttpOnly cookie "arkla_token"]        |
   |<-- redirect / (dashboard) ----|                               |
   |                               |                               |
   |--- GET /api/v1/surat -------->|                               |
   |                    [apiClient reads cookie automatically]     |
   |                               |--- GET /api/v1/surat -------->|
   |                               |    [header: Cookie: arkla_token=...]
   |                               |                    [verify JWT middleware]
   |                               |<-- { data: [...] } -----------|
   |<-- renders archive data ------|                               |
```

### 3.3 Detail Token & Cookie

| Parameter | Value |
|---|---|
| Token Type | JWT (HS256) |
| Secret Key | `SECRET_KEY` dari `.env` (min. 32 karakter random) |
| Cookie Name | `arkla_token` |
| Cookie Flags | `HttpOnly=True`, `SameSite=Strict`, `Secure=True` (production) |
| Token Expiry | 8 jam (default) / 7 hari (jika "Ingat Saya" dicentang) |
| Token Payload | `{ sub: user_id, username, nama, role, exp }` |

### 3.4 Arsitektur Backend — FastAPI

#### Dependency Injection Pattern
```python
# app/core/auth.py
async def get_current_user(token: str = Cookie(alias="arkla_token")):
    """FastAPI dependency — digunakan di endpoint yang membutuhkan auth"""
    ...

# Penggunaan di route yang PERLU auth (NEW endpoints):
@router.post("/auth/register")
async def register(data: RegisterRequest, current_user: User = Depends(get_current_user)):
    ...

# Endpoint EXISTING — TIDAK akan ditambahkan Depends(get_current_user):
@router.get("/surat")  # TIDAK BERUBAH
async def list_surat(...):
    ...
```

> ⚠️ **KEPUTUSAN KRITIS**: Endpoint existing (`/surat`, `/process-surat`, `/export`, dll.) **TIDAK** akan ditambahkan dependency auth pada tahap awal. Proteksi dilakukan di level **Next.js middleware**, bukan di FastAPI. Hal ini memastikan zero breaking change pada backend existing.

#### Tabel Database Baru
```sql
-- users — tabel autentikasi
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,          -- UUID v4
    username    TEXT UNIQUE NOT NULL,
    nama        TEXT NOT NULL,
    password_hash TEXT NOT NULL,           -- bcrypt hashed
    role        TEXT NOT NULL DEFAULT 'operator',  -- 'admin' | 'operator'
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

#### Router Baru: `app/routes/auth.py`
| Method | Endpoint | Auth Required | Deskripsi |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Tidak | Login, return JWT via Set-Cookie |
| POST | `/api/v1/auth/logout` | Ya (cookie) | Hapus cookie |
| POST | `/api/v1/auth/register` | Ya (Admin only) | Buat akun baru |
| GET | `/api/v1/auth/me` | Ya (cookie) | Ambil info user yang login |
| POST | `/api/v1/auth/refresh` | Ya (cookie) | Refresh token (opsional, fase 2) |

### 3.5 Arsitektur Frontend — Next.js

#### Middleware (`src/middleware.ts`) — BARU
```
Request masuk ke semua rute
    ↓
Baca cookie "arkla_token"
    ↓
[Ada token?] → Verifikasi ekspirasi dengan jose (edge-compatible)
    ├── Valid → lanjut (pass-through)
    ├── Expired → redirect /login?reason=expired
    └── Tidak ada → redirect /login
    
[Path sudah /login?]
    └── Ada token valid → redirect /
```

**Rute yang diproteksi middleware:**
- `/` → protected
- `/upload` → protected
- `/archive` → protected
- `/archive/:id` → protected
- `/register` → protected + admin only

**Rute publik (bypass middleware):**
- `/login`
- `/_next/*` (asset Next.js)
- `/api/*` (Next.js API routes jika ada)
- file publik (`*.svg`, `*.ico`, `*.png`)

#### Context Baru: `src/lib/auth-context.tsx`
```typescript
interface AuthContextType {
  user: AuthUser | null;         // null jika belum login
  isLoading: boolean;            // loading state saat verifikasi awal
  login: (username, password, rememberMe) => Promise<void>;
  logout: () => Promise<void>;
}
```

**Integrasi dengan `RootLayout`**: `AuthProvider` dibungkus di dalam `SidebarProvider` — **urutan wrapper tidak boleh diubah**.

#### Modifikasi `APIClient` (`src/lib/api-client.ts`)
Tambahkan `credentials: "include"` ke semua `fetch()` call agar cookie dikirim otomatis:
```typescript
// SEBELUM:
const response = await fetch(url, { ...options, headers: {...} });

// SESUDAH:
const response = await fetch(url, { 
  ...options, 
  credentials: "include",  // ← tambahan ini saja
  headers: {...} 
});
```
> Perubahan ini **non-breaking** — hanya memastikan cookie ikut terkirim ke backend.

#### Penanganan 401 di `APIClient`
```typescript
if (response.status === 401) {
  // Token expired/invalid → redirect ke login
  if (typeof window !== 'undefined') {
    window.location.href = '/login?reason=session_expired';
  }
  throw new Error('Sesi habis. Silakan login kembali.');
}
```

### 3.6 Dependency Baru yang Dibutuhkan

#### Backend (`requirements.txt`)
```
python-jose[cryptography]>=3.3.0   # JWT encoding/decoding
passlib[bcrypt]>=1.7.4             # Password hashing
bcrypt>=4.0.0                      # bcrypt backend for passlib
```

#### Frontend (`package.json`)
```
jose: ^5.9.0                       # Edge-compatible JWT verification (untuk middleware)
```

> `jose` dipilih karena kompatibel dengan **Next.js Edge Runtime** yang digunakan middleware. Library `jsonwebtoken` tidak bisa digunakan di edge runtime.

---

## 4. Coding Rules & Safeguards

### RULE-01: Zero Modification pada Pipeline OCR & Data Processing

**DILARANG KERAS** memodifikasi file-file berikut kecuali ada keputusan eksplisit:
- `arkla-backend/app/routes/process.py`
- `arkla-backend/app/services/` (semua file)
- `arkla-backend/app/core/database.py` — **KECUALI** hanya menambahkan tabel `users` di akhir fungsi `init_database()`, tidak mengubah tabel yang sudah ada
- `arkla-frontend/src/components/upload/` (semua file)
- `arkla-frontend/src/app/upload/page.tsx`

### RULE-02: Endpoint Existing Tetap Publik di Backend

Semua endpoint berikut **TIDAK akan mendapatkan** dependency `Depends(get_current_user)`:
```
GET  /api/v1/surat
GET  /api/v1/surat/{id}
POST /api/v1/verify
POST /api/v1/process-surat
GET  /api/v1/export
POST /api/v1/export
GET  /api/v1/download/{filename}
GET  /api/v1/preview-disposisi/{id}
GET  /api/v1/master-data/...
GET  /api/v1/health
GET  /health
```
Proteksi akses ke endpoint ini dilakukan secara eksklusif di **Next.js middleware** (frontend layer).

### RULE-03: Isolasi Perubahan di `api-client.ts`

Satu-satunya perubahan yang diizinkan di file `api-client.ts` adalah:
1. Menambahkan `credentials: "include"` pada method `request<T>()` dan `processSurat()`.
2. Menambahkan penanganan HTTP 401 yang redirect ke `/login`.
3. Menambahkan method baru `login()`, `logout()`, `getMe()`.

**DILARANG** mengubah signature method yang sudah ada (nama parameter, return type, dll).

### RULE-04: Tidak Mengubah Struktur Tabel yang Sudah Ada

Tabel SQLite yang sudah ada (`surat`, `surat_*`, `ref_klasifikasi`, dll.) **TIDAK BOLEH** dimodifikasi strukturnya (ALTER TABLE, DROP COLUMN, dll). Hanya `CREATE TABLE IF NOT EXISTS users` yang ditambahkan.

### RULE-05: Middleware Harus Menggunakan Config Matcher yang Tepat

```typescript
// src/middleware.ts
export const config = {
  matcher: [
    // Proteksi semua rute kecuali /login, assets statis, dan _next internals
    '/((?!login|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.ico).*)',
  ],
};
```
Setiap perubahan pada `matcher` **harus diverifikasi** tidak memblokir asset statis (SVG icon, dll.) karena `Sidebar.tsx` dan `Navbar.tsx` menggunakan banyak `<Image src="/*.svg">`.

### RULE-06: Tidak Mengubah Hierarki Provider di `layout.tsx`

`RootLayout` saat ini memiliki:
```tsx
<SidebarProvider>{children}</SidebarProvider>
```

Setelah menambahkan `AuthProvider`, hierarkinya menjadi:
```tsx
<AuthProvider>
  <SidebarProvider>{children}</SidebarProvider>
</AuthProvider>
```
`AuthProvider` harus berada di **luar** `SidebarProvider`, bukan sebaliknya. `SidebarProvider` tidak boleh dipindah atau dihapus.

### RULE-07: Halaman Login Menggunakan Layout Sendiri (Bukan `DashboardLayout`)

`/login` dan `/register` menggunakan layout minimal (tidak ada Sidebar, Navbar). Oleh karena itu:
- **Jangan** membungkus halaman login dengan `<DashboardLayout>`.
- **Jangan** membuat `SidebarProvider` memunculkan error ketika dirender di halaman login.

### RULE-08: Penanganan Error Auth Harus User-Friendly

```typescript
// DILARANG (expose info teknis):
throw new Error("JWT signature verification failed");

// WAJIB (user-friendly):
throw new Error("Username atau password salah.");
```

Di backend, semua response error autentikasi harus menggunakan format yang konsisten:
```json
{
  "status": "error",
  "code": "INVALID_CREDENTIALS",
  "message": "Username atau password salah.",
  "timestamp": "..."
}
```

### RULE-09: Cookie Secure Flag Berdasarkan Environment

```python
# Di backend, set cookie:
response.set_cookie(
    key="arkla_token",
    value=token,
    httponly=True,
    samesite="strict",
    secure=settings.is_production,   # True di production, False di development
    max_age=token_expire_seconds
)
```

### RULE-10: Seed User Admin Default

Saat `init_database()` dipanggil, jika tabel `users` kosong, buat satu akun admin default:
- Username: `admin`
- Password: `Admin@DPRD2026` (harus diganti setelah login pertama)
- Role: `admin`

Password default ini **HARUS** didokumentasikan di `README.md` backend.

### RULE-11: CORS Update Diperlukan untuk Cookie

Karena sekarang frontend mengirim cookie (`credentials: "include"`), backend **HARUS** mengganti `allow_origins=["*"]` menjadi daftar origin spesifik:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://arkla-frontend.vercel.app",  # sesuaikan dengan domain production
    ],
    allow_credentials=True,  # sudah True, jaga jangan diubah
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)
```
> Wildcard `*` pada `allow_origins` **tidak kompatibel** dengan `allow_credentials=True` ketika browser mengirim cookie. Ini akan menyebabkan error CORS di browser.

---

## 5. Daftar File yang Akan Dimodifikasi & Dibuat

### 5.1 Backend (`arkla-backend`)

#### File BARU yang akan dibuat:

| Path | Deskripsi |
|---|---|
| `app/routes/auth.py` | Router autentikasi: login, logout, register, me |
| `app/core/auth.py` | Core auth logic: JWT encode/decode, dependency `get_current_user`, hash password |
| `app/models/auth_schemas.py` | Pydantic schemas: `LoginRequest`, `RegisterRequest`, `TokenPayload`, `UserResponse` |

#### File yang akan DIMODIFIKASI:

| Path | Perubahan |
|---|---|
| `app/main.py` | Tambahkan `from app.routes import auth` dan `app.include_router(auth.router, ...)`. Update `allow_origins` di CORS middleware. |
| `app/core/database.py` | Tambahkan `CREATE TABLE IF NOT EXISTS users` di akhir `init_database()` dan seed admin default. |
| `app/core/config.py` | Tambahkan setting: `secret_key`, `token_expire_hours`, `token_expire_days_remember`. |
| `.env.example` | Tambahkan `SECRET_KEY`, `TOKEN_EXPIRE_HOURS`, `CORS_ORIGINS` (ubah dari wildcard). |
| `requirements.txt` | Tambahkan `python-jose[cryptography]`, `passlib[bcrypt]`, `bcrypt`. |

#### File yang TIDAK akan dimodifikasi:
- `app/routes/process.py` ✅
- `app/routes/surat.py` ✅
- `app/routes/export.py` ✅
- `app/routes/master_data.py` ✅
- `app/core/constants.py` ✅
- `app/core/utils.py` ✅
- `app/models/schemas.py` ✅
- `app/services/` (semua) ✅

---

### 5.2 Frontend (`arkla-frontend`)

#### File BARU yang akan dibuat:

| Path | Deskripsi |
|---|---|
| `src/middleware.ts` | Next.js middleware untuk route protection. Verifikasi `arkla_token` cookie. |
| `src/lib/auth-context.tsx` | React Context: `AuthProvider`, `useAuth()`. Menyimpan state user yang login. |
| `src/app/login/page.tsx` | Halaman Login — form username & password |
| `src/app/register/page.tsx` | Halaman Register — hanya admin |
| `src/components/auth/LoginForm.tsx` | Komponen form login (terpisah untuk testability) |
| `src/components/auth/RegisterForm.tsx` | Komponen form register |

#### File yang akan DIMODIFIKASI:

| Path | Perubahan |
|---|---|
| `src/app/layout.tsx` | Tambahkan `<AuthProvider>` sebagai wrapper terluar (di luar `SidebarProvider`). |
| `src/lib/api-client.ts` | Tambahkan `credentials: "include"` di semua fetch. Tambahkan handler 401. Tambahkan method `login()`, `logout()`, `getMe()`. |
| `src/components/Sidebar.tsx` | Ganti hardcoded "Admin" / "DPRD Sleman" dengan data dinamis dari `useAuth()`. Tambahkan tombol Logout. |
| `src/lib/types.ts` | Tambahkan type baru: `AuthUser`, `LoginRequest`, `LoginResponse`. |
| `src/lib/config.ts` | Tidak perlu perubahan substansial — mungkin hanya tambah komentar. |
| `package.json` | Tambahkan dependensi `jose`. |
| `next.config.ts` | Tidak perlu perubahan. |

#### File yang TIDAK akan dimodifikasi:
- `src/app/page.tsx` ✅ (Dashboard)
- `src/app/upload/page.tsx` ✅
- `src/app/archive/page.tsx` ✅
- `src/app/archive/[id]/page.tsx` ✅
- `src/components/DashboardLayout.tsx` ✅
- `src/components/Navbar.tsx` ✅
- `src/components/StatCard.tsx` ✅
- `src/components/RecentArchives.tsx` ✅
- `src/components/Toast.tsx` ✅
- `src/components/upload/` (semua) ✅
- `src/components/archive/` (semua) ✅
- `src/lib/sidebar-context.tsx` ✅

---

## 6. Rencana Migrasi Database

Karena database menggunakan SQLite dan tidak ada migration tool (Alembic/Flyway), migrasi dilakukan dengan pendekatan **additive-only**:

```python
# Di init_database() — TAMBAHAN di bawah tabel yang sudah ada:

# TABEL BARU: users
cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        nama TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'operator',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")

# SEED: Admin default (hanya jika tabel kosong)
cursor.execute("SELECT COUNT(*) as count FROM users")
if cursor.fetchone()['count'] == 0:
    import uuid
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    cursor.execute("""
        INSERT INTO users (id, username, nama, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
    """, (str(uuid.uuid4()), "admin", "Administrator", 
          pwd_context.hash("Admin@DPRD2026"), "admin"))
```

**Strategi `CREATE TABLE IF NOT EXISTS`**: Jika database sudah ada (kasus upgrade), tabel baru ditambahkan tanpa mempengaruhi tabel existing.

---

## 7. Checklist Verifikasi Pasca-Implementasi

Setelah implementasi selesai, verifikasi wajib dilakukan terhadap poin-poin berikut:

### ✅ Fitur Auth Baru
- [ ] Login dengan kredensial benar → berhasil masuk ke dashboard
- [ ] Login dengan kredensial salah → pesan error tepat, tidak expose detail server
- [ ] Logout → cookie terhapus, redirect ke /login
- [ ] Akses `/` tanpa login → redirect ke /login
- [ ] Akses `/login` saat sudah login → redirect ke /
- [ ] Token expired → redirect ke /login dengan pesan sesi habis
- [ ] Nama user di sidebar menampilkan data dari token (bukan hardcoded "Admin")

### ✅ Fitur Existing Tidak Terganggu
- [ ] Dashboard statistik masih load dengan benar
- [ ] Upload surat baru (full pipeline OCR+LLM) masih berjalan
- [ ] Halaman archive menampilkan data dan filter berfungsi
- [ ] Detail surat (`/archive/[id]`) dapat dibuka
- [ ] Export Excel/CSV masih berfungsi
- [ ] Lembar Disposisi (preview + print) masih berfungsi
- [ ] API health check (`/health`) masih return 200

### ✅ Keamanan
- [ ] Cookie `arkla_token` memiliki flag `HttpOnly`
- [ ] Cookie tidak bisa dibaca via `document.cookie` di browser console
- [ ] Password di database tersimpan dalam bentuk hash (bukan plaintext)
- [ ] Response error auth tidak mengandung stack trace di production

---

> **Langkah Selanjutnya**: Setelah dokumen ini disetujui, implementasi akan dimulai dengan urutan:  
> 1️⃣ Backend: `requirements.txt` → `database.py` → `config.py` → `auth.py` (core) → `auth_schemas.py` → `auth.py` (router) → `main.py`  
> 2️⃣ Frontend: `package.json` (install jose) → `types.ts` → `auth-context.tsx` → `api-client.ts` → `middleware.ts` → halaman `/login` → halaman `/register` → `Sidebar.tsx` → `layout.tsx`
