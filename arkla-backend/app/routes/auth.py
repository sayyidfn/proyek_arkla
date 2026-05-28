"""
Authentication Routes — ARKLA
Menyediakan endpoint untuk Login, Logout, Register, dan Get Current User (Me).
"""

import uuid
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.auth import (
    get_current_user,
    require_admin,
    hash_password,
    verify_password,
    create_access_token,
)
from app.core.config import settings
from app.core.database import get_db
from app.models.auth_schemas import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    LogoutResponse,
    MeResponse,
    UserResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, response: Response):
    """
    Endpoint Login.
    Verifikasi username & password, lalu set HttpOnly cookie 'arkla_token'.
    """
    username = login_data.username.lower().strip()
    password = login_data.password

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, username, nama, password_hash, role, is_active, created_at FROM users WHERE username = ?",
                (username,),
            )
            user_row = cursor.fetchone()
    except Exception as e:
        logger.error(f"Database error saat login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "error",
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Terjadi kesalahan server saat memproses login.",
            },
        )

    if not user_row or not verify_password(password, user_row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "status": "error",
                "code": "INVALID_CREDENTIALS",
                "message": "Username atau password salah.",
            },
        )

    if not user_row["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "error",
                "code": "ACCOUNT_DISABLED",
                "message": "Akun Anda dinonaktifkan. Silakan hubungi Administrator.",
            },
        )

    # Tentukan waktu kedaluwarsa token berdasarkan 'remember_me'
    if login_data.remember_me:
        expire_delta = timedelta(days=settings.token_expire_days_remember)
        max_age = settings.token_expire_days_remember * 24 * 3600
    else:
        expire_delta = timedelta(hours=settings.token_expire_hours)
        max_age = settings.token_expire_hours * 3600

    token_payload = {
        "sub": user_row["id"],
        "username": user_row["username"],
        "role": user_row["role"]
    }
    token = create_access_token(data=token_payload, expires_delta=expire_delta)

    # Set cookie HttpOnly
    response.set_cookie(
        key="arkla_token",
        value=token,
        httponly=True,
        samesite="none",
        secure=True,
        max_age=max_age,
    )

    user_response = UserResponse(
        id=user_row["id"],
        username=user_row["username"],
        nama=user_row["nama"],
        role=user_row["role"],
        is_active=bool(user_row["is_active"]),
        created_at=str(user_row["created_at"]),
    )

    return LoginResponse(
        status="success",
        message="Login berhasil",
        user=user_response,
        access_token=token,
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(response: Response, current_user: dict = Depends(get_current_user)):
    """
    Endpoint Logout.
    Hapus cookie 'arkla_token'.
    """
    response.delete_cookie(
        key="arkla_token",
        httponly=True,
        samesite="none",
        secure=True,
    )
    return LogoutResponse(
        status="success",
        message="Logout berhasil",
    )


@router.post("/register", response_model=RegisterResponse)
async def register(
    register_data: RegisterRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Endpoint Register (Hanya Admin).
    Membuat user/operator baru di sistem.
    """
    username = register_data.username
    nama = register_data.nama
    password = register_data.password
    role = register_data.role

    # Cek apakah username sudah digunakan
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            existing_user = cursor.fetchone()
    except Exception as e:
        logger.error(f"Database error saat cek username: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "error",
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Terjadi kesalahan server saat memeriksa username.",
            },
        )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "status": "error",
                "code": "USERNAME_ALREADY_EXISTS",
                "message": f"Username '{username}' sudah terdaftar. Silakan pilih username lain.",
            },
        )

    new_id = str(uuid.uuid4())
    password_hash = hash_password(password)
    created_at = datetime.now(timezone.utc).isoformat()

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO users (id, username, nama, password_hash, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (new_id, username, nama, password_hash, role, 1, created_at, created_at),
            )
    except Exception as e:
        logger.error(f"Database error saat menyimpan user baru: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "error",
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Terjadi kesalahan server saat menyimpan user baru.",
            },
        )

    user_response = UserResponse(
        id=new_id,
        username=username,
        nama=nama,
        role=role,
        is_active=True,
        created_at=created_at,
    )

    return RegisterResponse(
        status="success",
        message="Akun berhasil dibuat",
        user=user_response,
    )


@router.get("/me", response_model=MeResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Endpoint GET /me.
    Mengembalikan data user yang sedang login dari token cookie.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, username, nama, role, is_active, created_at FROM users WHERE id = ?",
                (current_user["id"],),
            )
            user_row = cursor.fetchone()
    except Exception as e:
        logger.error(f"Database error saat get me: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "error",
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Terjadi kesalahan server saat mengambil data profil.",
            },
        )

    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "status": "error",
                "code": "USER_NOT_FOUND",
                "message": "Data user tidak ditemukan.",
            },
        )

    user_response = UserResponse(
        id=user_row["id"],
        username=user_row["username"],
        nama=user_row["nama"],
        role=user_row["role"],
        is_active=bool(user_row["is_active"]),
        created_at=str(user_row["created_at"]),
    )

    return MeResponse(
        status="success",
        user=user_response,
    )
