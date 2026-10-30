import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
IS_RENDER = bool(os.getenv("RENDER"))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'pestfree.db'}")
# Render gives "postgres://..." (or "postgresql://..."). Newer SQLAlchemy would pick the "psycopg"
# (version 3) driver for that, but we installed psycopg2-binary, so we name the driver explicitly.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://"):]
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = "postgresql+psycopg2://" + DATABASE_URL[len("postgresql://"):]

# On Render the SECRET_KEY must be set (Environment tab). Never run online with the dev key,
# because anyone who knows it could create fake login tokens.
_secret = os.getenv("SECRET_KEY")
if not _secret and IS_RENDER:  # Render sets RENDER=true automatically
    raise RuntimeError("SECRET_KEY is not set. Add it in Render > Environment.")
SECRET_KEY = _secret or "dev-only-secret-change-me-before-sharing-123"
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 8

DUE_AFTER_DAYS = int(os.getenv("DUE_AFTER_DAYS", "14"))
OVERDUE_AFTER_DAYS = int(os.getenv("OVERDUE_AFTER_DAYS", "30"))
if not 0 < DUE_AFTER_DAYS < OVERDUE_AFTER_DAYS:
    raise RuntimeError(
        "DUE_AFTER_DAYS and OVERDUE_AFTER_DAYS must be positive, "
        "with DUE_AFTER_DAYS lower than OVERDUE_AFTER_DAYS."
    )