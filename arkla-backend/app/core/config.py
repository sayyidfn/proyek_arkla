import os
from pydantic_settings import BaseSettings
from typing import Optional, List
import secrets


class Settings(BaseSettings):
    # API Keys
    google_api_key: Optional[str] = None
    
    # Gemini Configuration
    gemini_model: str = "gemini-2.5-flash"  # Fixed: was "gemini-2-flash" (invalid)
    gemini_ocr_enabled: bool = True
    gemini_summarization_enabled: bool = True
    gemini_auto_fill_enabled: bool = True
    gemini_kode_matching_enabled: bool = False
    
    # Cost Management
    gemini_daily_cost_limit: float = 10.0
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    environment: str = "development"  # development, staging, production
    
    # Database
    database_path: str = "database/arkla.db"
    
    # File handling
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    allowed_formats: list = ["application/pdf", "image/jpeg", "image/png"]
    
    # CORS - separate frontend URLs with comma
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000"
    
    # Authentication / JWT
    secret_key: str = "GANTI_INI_DI_PRODUCTION_WAJIB_MIN_32_KARAKTER_RANDOM"
    algorithm: str = "HS256"
    token_expire_hours: int = 8          # Durasi sesi normal
    token_expire_days_remember: int = 7  # Durasi sesi "Ingat Saya"
    
    # Rate Limiting
    rate_limit_requests: int = 60  # requests per minute
    rate_limit_window: int = 60  # window in seconds
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        # Wildcard '*' tidak kompatibel dengan allow_credentials=True (CORS spec).
        # Origin harus spesifik agar cookie-based auth berjalan.
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        return origins if origins else ["http://localhost:3000"]
    
    @property
    def is_production(self) -> bool:
        return self.environment == "production"
    
    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
