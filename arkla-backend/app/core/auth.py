"""
Core Authentication Logic — ARKLA
Berisi fungsi hashing password, JWT encode/decode,
FastAPI dependencies (get_current_user, require_admin),
dan fungsi seed admin default.
"""

import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError, jwt
import bcrypt

from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)

# ─── Password Hashing ─────────────────────────────────────────────────────────


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifikasi plain password terhadap hash yang tersimpan di database."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception as e:
        logger.error(f"Error verifikasi password: {e}")
        return False


def hash_password(password: str) -> str:
    """Hash password menggunakan bcrypt. Tidak pernah simpan plaintext."""
    # Gunakan cost factor 12 (sesuai PRD)
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


# ─── JWT Token ────────────────────────────────────────────────────────────────

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Buat JWT access token yang di-sign dengan SECRET_KEY.

    Args:
        data: Payload yang akan dikodekan (setidaknya harus ada 'sub').
        expires_delta: Override waktu kedaluwarsa. Jika None, gunakan default
                       dari settings.token_expire_hours.
    Returns:
        String JWT yang ter-encode.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=settings.token_expire_hours)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode dan verifikasi JWT token.

    Returns:
        Dict payload jika token valid, None jika tidak valid / expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        return payload
    except JWTError:
        return None


# ─── FastAPI Dependencies ──────────────────────────────────────────────────────

async def get_current_user(
    arkla_token: Optional[str] = Cookie(default=None),
) -> dict:
    """
    FastAPI dependency — Membaca JWT dari HttpOnly cookie 'arkla_token'.

    Digunakan di endpoint yang membutuhkan autentikasi (khususnya endpoint
    auth baru seperti /me, /logout, /register).

    CATATAN PENTING: Endpoint arsip existing (GET /surat, POST /process-surat,
    dll.) TIDAK menggunakan dependency ini sesuai keputusan di AUTH_PRD_AND_RULES.md
    (Rule #2). Proteksi endpoint existing dilakukan di level Next.js middleware.

    Raises:
        HTTPException 401: Jika token tidak ada, tidak valid, atau expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "status": "error",
            "code": "NOT_AUTHENTICATED",
            "message": "Sesi tidak valid. Silakan login kembali.",
        },
    )

    if not arkla_token:
        raise credentials_exception

    payload = decode_access_token(arkla_token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception

    # Verifikasi user masih ada dan aktif di database
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, username, nama, role, is_active FROM users WHERE id = ?",
                (user_id,),
            )
            user_row = cursor.fetchone()
    except Exception as e:
        logger.error(f"Database error saat verifikasi user: {e}")
        raise credentials_exception

    if not user_row or not user_row["is_active"]:
        raise credentials_exception

    return {
        "id": user_row["id"],
        "username": user_row["username"],
        "nama": user_row["nama"],
        "role": user_row["role"],
    }


async def require_admin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    FastAPI dependency — Hanya izinkan pengguna dengan role 'admin'.

    Raises:
        HTTPException 403: Jika user bukan admin.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "error",
                "code": "FORBIDDEN",
                "message": "Akses ditolak. Hanya Admin yang diizinkan melakukan aksi ini.",
            },
        )
    return current_user


# ─── Seed Default Admin ────────────────────────────────────────────────────────

def seed_default_admin() -> None:
    """
    Buat akun admin default jika tabel 'users' masih kosong.
    Dipanggil sekali saat aplikasi startup (dari main.py lifespan).

    Default credentials:
        Username : admin
        Password : Admin@DPRD2026
        Role     : admin

    PERINGATAN: Ganti password ini segera setelah login pertama!
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM users")
            count = cursor.fetchone()["count"]

            if count == 0:
                admin_id = str(uuid.uuid4())
                admin_password_hash = hash_password("Admin@DPRD2026")
                cursor.execute(
                    """
                    INSERT INTO users (id, username, nama, password_hash, role, is_active)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (admin_id, "admin", "Administrator", admin_password_hash, "admin", 1),
                )
                logger.info("✅ Default admin user seeded successfully")
                logger.warning(
                    "⚠️  Default admin password: 'Admin@DPRD2026'. "
                    "WAJIB diganti setelah login pertama!"
                )
    except Exception as e:
        logger.error(f"❌ Gagal seed admin default: {e}")
        # Tidak raise — kegagalan seed tidak boleh menghentikan startup server
