"""Create portable, compressed backups of the configured database."""

from __future__ import annotations

import json
import os
import re
import zipfile
from base64 import b64encode
from datetime import date, datetime, time, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import Base, SessionLocal, get_db
from app.db.repositories import UserRepository
from app.errors import ServiceError
from app.services.auth_service import decode_token

router = APIRouter(prefix="/backups", tags=["Backups"])
backup_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)
BACKUP_NAME = re.compile(r"^pestfree-backup-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}\.zip$")


def backup_directory() -> Path:
    configured = os.getenv("BACKUP_DIR", str(Path("backups").resolve()))
    directory = Path(configured).expanduser()
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _json_value(value: Any) -> Any:
    if isinstance(value, (datetime, date, time)):
        return {"$datetime": value.isoformat()}
    if isinstance(value, Decimal):
        return {"$decimal": str(value)}
    if isinstance(value, UUID):
        return {"$uuid": str(value)}
    if isinstance(value, (bytes, bytearray, memoryview)):
        return {"$bytes": b64encode(bytes(value)).decode("ascii")}
    return value


def create_backup(directory: Path | None = None) -> tuple[Path, dict[str, int]]:
    """Create an atomic JSON snapshot for SQLite or PostgreSQL."""
    import secrets

    target_directory = directory or backup_directory()
    target_directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    suffix = secrets.token_hex(6)
    name = f"pestfree-backup-{stamp}-{suffix}.zip"
    final_path = target_directory / name
    temporary_path = target_directory / f".{name}.tmp"

    counts: dict[str, int] = {}
    db = SessionLocal()
    try:
        tables = list(Base.metadata.sorted_tables)
        payloads: dict[str, list[dict[str, Any]]] = {}
        for table in tables:
            rows = [
                {
                    column.name: _json_value(row[column.name])
                    for column in table.columns
                }
                for row in db.execute(select(table)).mappings()
            ]
            payloads[table.name] = rows
            counts[table.name] = len(rows)

        manifest = {
            "format": "pestfree-db-backup-v1",
            "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
            "database_kind": db.bind.dialect.name,
            "tables": counts,
            "warning": "Contains personal and exact-location data; restrict access.",
        }
        with zipfile.ZipFile(
            temporary_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9
        ) as archive:
            archive.writestr(
                "manifest.json",
                json.dumps(manifest, indent=2, sort_keys=True),
            )
            for table_name, rows in payloads.items():
                archive.writestr(
                    f"tables/{table_name}.json",
                    json.dumps(rows, indent=2, sort_keys=True, default=_json_value),
                )
        os.replace(temporary_path, final_path)
    finally:
        db.close()
        temporary_path.unlink(missing_ok=True)

    prune_backups(target_directory)
    return final_path, counts


def prune_backups(directory: Path | None = None) -> list[Path]:
    try:
        keep = max(1, int(os.getenv("BACKUP_RETENTION_COUNT", "30")))
    except ValueError:
        keep = 30
    target_directory = directory or backup_directory()
    backups = sorted(
        (
            path
            for path in target_directory.iterdir()
            if path.is_file() and BACKUP_NAME.fullmatch(path.name)
        ),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    removed: list[Path] = []
    for old_path in backups[keep:]:
        old_path.unlink()
        removed.append(old_path)
    return removed


def _cron_authorized(request: Request) -> bool:
    expected = os.getenv("BACKUP_CRON_TOKEN", "")
    if not expected:
        return False
    supplied = request.headers.get("X-Backup-Cron-Key", "")
    import hmac

    return hmac.compare_digest(supplied, expected)


def optional_creator(
    request: Request,
    token: str | None = Depends(backup_oauth2),
    db: Session = Depends(get_db),
):
    if _cron_authorized(request):
        return None
    if not token:
        raise ServiceError("Authentication required.", 401)
    user = UserRepository(db).get_by_id(decode_token(token))
    if not user:
        raise ServiceError("User no longer exists.", 401)
    return user


def _require_creator(request: Request, user: object) -> None:
    if not _cron_authorized(request):
        if getattr(user, "role", None) != "coordinator":
            raise ServiceError("Coordinator access required.", 403)


def _backup_path(filename: str) -> Path:
    if not BACKUP_NAME.fullmatch(filename):
        raise ServiceError("Invalid backup filename.", 404)
    path = backup_directory() / filename
    if not path.is_file():
        raise ServiceError("Backup not found.", 404)
    return path


@router.post("/create")
def create_backup_endpoint(
    request: Request, user=Depends(optional_creator)
):
    _require_creator(request, user)
    path, counts = create_backup()
    return {"filename": path.name, "tables": counts}


@router.get("", response_model=list[dict[str, object]])
def list_backups(user=Depends(get_current_user)):
    if getattr(user, "role", None) != "coordinator":
        raise ServiceError("Coordinator access required.", 403)
    result = []
    for path in sorted(backup_directory().iterdir(), key=lambda item: item.stat().st_mtime, reverse=True):
        if path.is_file() and BACKUP_NAME.fullmatch(path.name):
            result.append(
                {
                    "filename": path.name,
                    "size_bytes": path.stat().st_size,
                    "created_at": datetime.fromtimestamp(
                        path.stat().st_mtime, timezone.utc
                    ).isoformat().replace("+00:00", "Z")
                }
            )
    return result


@router.get("/{filename}")
def download_backup(
    filename: str, user=Depends(get_current_user)
):
    if getattr(user, "role", None) != "coordinator":
        raise ServiceError("Coordinator access required.", 403)
    path = _backup_path(filename)
    return FileResponse(
        path,
        media_type="application/zip",
        filename=path.name,
        headers={"Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'"},
    )
