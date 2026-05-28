"""
Authentication Pydantic Schemas — ARKLA
Mendefinisikan struktur request & response untuk endpoint auth.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional


# ========== REQUEST SCHEMAS ==========

class LoginRequest(BaseModel):
    """Schema untuk request POST /api/v1/auth/login"""
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Username akun ARKLA"
    )
    password: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Password akun"
    )
    remember_me: bool = Field(
        default=False,
        description="Jika True, sesi diperpanjang hingga 7 hari"
    )


class RegisterRequest(BaseModel):
    """Schema untuk request POST /api/v1/auth/register (Admin only)"""
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r'^[a-zA-Z0-9_]+$',
        description="Username unik (hanya huruf, angka, underscore)"
    )
    nama: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Nama lengkap pengguna"
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="Password minimal 8 karakter"
    )
    confirm_password: str = Field(
        ...,
        description="Konfirmasi password (harus sama dengan password)"
    )
    role: Literal["admin", "operator"] = Field(
        default="operator",
        description="Role pengguna: 'admin' atau 'operator'"
    )

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        """Validasi kesesuaian password dan konfirmasi password."""
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Password dan konfirmasi password tidak cocok.")
        return v

    @field_validator("username")
    @classmethod
    def username_normalize(cls, v: str) -> str:
        """Normalisasi username menjadi lowercase tanpa spasi."""
        return v.lower().strip()

    @field_validator("nama")
    @classmethod
    def nama_strip(cls, v: str) -> str:
        return v.strip()


# ========== RESPONSE SCHEMAS ==========

class UserResponse(BaseModel):
    """Data pengguna yang dikembalikan dalam response (tanpa password)."""
    id: str
    username: str
    nama: str
    role: str
    is_active: bool
    created_at: str


class LoginResponse(BaseModel):
    """Response sukses untuk POST /api/v1/auth/login"""
    status: str = "success"
    message: str = "Login berhasil"
    user: UserResponse


class RegisterResponse(BaseModel):
    """Response sukses untuk POST /api/v1/auth/register"""
    status: str = "success"
    message: str = "Akun berhasil dibuat"
    user: UserResponse


class LogoutResponse(BaseModel):
    """Response sukses untuk POST /api/v1/auth/logout"""
    status: str = "success"
    message: str = "Logout berhasil"


class MeResponse(BaseModel):
    """Response sukses untuk GET /api/v1/auth/me"""
    status: str = "success"
    user: UserResponse
