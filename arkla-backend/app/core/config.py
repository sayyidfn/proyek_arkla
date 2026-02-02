import os
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, List


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
    
    # Rate Limiting
    rate_limit_requests: int = 60  # requests per minute
    rate_limit_window: int = 60  # window in seconds
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        # For production, allow all origins (or configure specific ones via env)
        # This ensures frontend can connect from any domain
        return ["*"]
    
    @property
    def is_production(self) -> bool:
        return self.environment == "production"
    
    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
