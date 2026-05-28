/**
 * ARKLA — Next.js Middleware (Edge Runtime)
 * Memproteksi seluruh halaman private menggunakan client-side cookies
 * yang tersinkronisasi saat login/refresh di cross-origin setup (Vercel & Hugging Face).
 *
 * LOGIKA REDIRECT:
 *  1. Belum login (`arkla_logged_in` tidak true) → redirect ke /login
 *  2. Sudah login + mengakses /login → redirect ke /
 *  3. Sudah login + role BUKAN admin + mengakses /register → redirect ke /
 */

import { NextRequest, NextResponse } from "next/server";

// Rute publik (tidak diproteksi middleware)
const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ambil client-side cookie status login & role
  const isLoggedInCookie = request.cookies.get("arkla_logged_in");
  const isAuthenticated = isLoggedInCookie?.value === "true";

  const roleCookie = request.cookies.get("arkla_role");
  const role = roleCookie?.value ?? "operator";

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
    return NextResponse.redirect(loginUrl);
  }

  // ── 3. Halaman /register → khusus Admin ─────────────────────
  if (pathname.startsWith("/register")) {
    if (role !== "admin") {
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
