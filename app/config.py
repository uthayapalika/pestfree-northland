import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'pestfree.db'}")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-secret-change-me-before-sharing-123")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 8