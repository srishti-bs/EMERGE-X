"""EMERGE-X Application Configuration.

Phase 2: Backend Data Layer.
Locked Stack: Python, FastAPI, SQLite initially.
"""

import os

# Base directory paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "backend", "data")
DEFAULT_DB_PATH = os.path.join(DATA_DIR, "emerge_x.db")


class Settings:
    """Central configuration parameters for EMERGE-X backend."""

    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "EMERGE-X")
    PROJECT_TAGLINE: str = os.getenv(
        "PROJECT_TAGLINE", "Clearing the way. Saving critical minutes."
    )
    VERSION: str = os.getenv("VERSION", "0.2.0")

    # API Configuration
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Database Configuration (SQLite initially, stored in backend/data/)
    BASE_DIR: str = BASE_DIR
    DATA_DIR: str = DATA_DIR
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.replace(os.sep, '/')}"
    )

    # CORS Configuration
    def __init__(self):
        cors_env = os.getenv("CORS_ORIGINS", "")
        if cors_env:
            self.CORS_ORIGINS: list[str] = [orig.strip() for orig in cors_env.split(",") if orig.strip()]
        else:
            self.CORS_ORIGINS: list[str] = [
                "*",
                "http://localhost:5173",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000",
            ]


settings = Settings()
