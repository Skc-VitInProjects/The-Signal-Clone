import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    PROJECT_NAME: str = "Signal Messenger Clone API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/signal.db")
    
    # JWT & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "signal-clone-super-secret-jwt-key-2026-production-ready")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    FIXED_OTP: str = "123456"  # Mocked OTP for quick login/verification
    
    # File Uploads
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_UPLOAD_SIZE: int = 15 * 1024 * 1024  # 15 MB
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*"
    ]

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
