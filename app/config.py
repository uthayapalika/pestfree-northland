import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'pestfree.db'}")
# Render gives "postgres://..." but SQLAlchemy needs "postgresql://..."
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# On Render the SECRET_KEY must be set (Environment tab). Never run online with the dev key,
# because anyone who knows it could create fake login tokens.
_secret = os.getenv("SECRET_KEY")
if not _secret and os.getenv("RENDER"):  # Render sets RENDER=true automatically
    raise RuntimeError("SECRET_KEY is not set. Add it in Render > Environment.")
SECRET_KEY = _secret or "dev-only-secret-change-me-before-sharing-123"
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 8