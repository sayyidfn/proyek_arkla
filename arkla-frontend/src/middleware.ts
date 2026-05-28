/**
 * ARKLA — Next.js Middleware (Edge Runtime)
 * Memproteksi seluruh halaman private menggunakan verifikasi JWT cookie.
 * Menggunakan library `jose` karena kompatibel dengan Edge Runtime.
 *
 * LOGIKA REDIRECT:
 *  1. Tidak ada cookie / token tidak valid → redirect ke /login
 *  2. Sudah login + mengakses /login → redirect ke /
 *  3. Sudah login + role BUKAN admin + mengakses /register → redirect ke /
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// ────────────────────────────────────────────────────────────────
// Konfigurasi
// ────────────────────────────────────────────────────────────────

/** Cookie name harus SAMA persis dengan yang di-set backend FastAPI */
const COOKIE_NAME = "arkla_token";

/**
 * JWT Secret — wajib diisi di .env.local (dev) / environment variable (prod).
 * Nilai DEFAULT ini HANYA untuk development lokal dan harus cocok dengan
 * SECRET_KEY di arkla-backend/.env agar verifikasi berhasil.
 */
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ??
    "GANTI_INI_DI_PRODUCTION_WAJIB_MIN_32_KARAKTER_RANDOM"
);

// ────────────────────────────────────────────────────────────────
// Rute publik (tidak diproteksi middleware)
// ────────────────────────────────────────────────────────────────
const PUBLIC_PATHS = ["/login"];

// ────────────────────────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────────────────────────

/** Verifikasi token JWT dan kembalikan payload-nya, atau null jika tidak valid. */
async function verifyToken(token: string): Promise<{
  sub: string;
  username: string;
  role: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    return payload as { sub: string; username: string; role: string };
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────
// Middleware utama
// ────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ambil cookie token
  const tokenCookie = request.cookies.get(COOKIE_NAME);
  const token = tokenCookie?.value ?? null;

  // Verifikasi token (null jika tidak ada / expired / tidak valid)
  const payload = token ? await verifyToken(token) : null;
  const isAuthenticated = payload !== null;

  // ── 1. Halaman publik: /login ────────────────────────────────
  if (PUBLIC_PATHS.includes(pathname)) {
    // Jika sudah login dan mencoba akses /login → redirect ke dashboard
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Belum login → persilakan akses /login
    return NextResponse.next();
  }

  // ── 2. Halaman private: semua selain /login ──────────────────
  if (!isAuthenticated) {
    // Belum login → redirect ke /login
    const loginUrl = new URL("/login", request.url);
    // Tambahkan alasan jika token ada tapi tidak valid (expired)
    if (token) {
      loginUrl.searchParams.set("reason", "session_expired");
    }
    return NextResponse.redirect(loginUrl);
  }

  // ── 3. Halaman /register → khusus Admin ─────────────────────
  if (pathname.startsWith("/register")) {
    if (payload?.role !== "admin") {
      // Operator / role lain tidak boleh akses register → redirect ke /
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ── Lanjutkan request seperti biasa ─────────────────────────
  return NextResponse.next();
}

// ────────────────────────────────────────────────────────────────
// Matcher — eksekusi middleware HANYA pada rute yang relevan.
// Aset statis, _next internal, dan file publik di-bypass otomatis.
// ────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Cocokkan SEMUA rute kecuali:
     * - _next/static  (bundle JS/CSS Next.js)
     * - _next/image   (optimized images)
     * - favicon.ico
     * - file ekstensi gambar/ikon di /public
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.svg|.*\\.png|.*\\.ico|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.gif).*)",
  ],
};
