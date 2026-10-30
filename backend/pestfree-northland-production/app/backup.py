"""Create and restore safe, online SQLite database snapshots."""

import argparse
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.engine import make_url

from app.config import BASE_DIR, DATABASE_URL


def sqlite_database_path(database_url: str = DATABASE_URL) -> Path:
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite" or not url.database or url.database == ":memory:":
        raise ValueError(
            "This command supports file-based SQLite only. Use your database "
            "provider's backup and recovery tools for PostgreSQL."
        )
    return Path(url.database).expanduser().resolve()


def _check_integrity(connection: sqlite3.Connection) -> None:
    result = connection.execute("PRAGMA integrity_check").fetchone()
    if result is None or result[0] != "ok":
        raise ValueError(f"SQLite integrity check failed: {result}")


def create_sqlite_backup(source_path: Path, output_path: Path) -> Path:
    source_path = source_path.expanduser().resolve()
    output_path = output_path.expanduser().resolve()
    if source_path == output_path:
        raise ValueError("The backup path must be different from the database path.")
    if not source_path.is_file():
        raise FileNotFoundError(f"Database file does not exist: {source_path}")
    if output_path.exists():
        raise FileExistsError(f"Backup already exists: {output_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    source = sqlite3.connect(str(source_path))
    destination = sqlite3.connect(str(output_path))
    complete = False
    try:
        _check_integrity(source)
        source.backup(destination)
        _check_integrity(destination)
        complete = True
    finally:
        destination.close()
        source.close()
        if not complete and output_path.exists():
            output_path.unlink()

    if os.name != "nt":
        output_path.chmod(0o600)
    return output_path


def restore_sqlite_backup(backup_path: Path, target_path: Path) -> Path | None:
    backup_path = backup_path.expanduser().resolve()
    target_path = target_path.expanduser().resolve()
    if backup_path == target_path:
        raise ValueError("The backup and database paths must be different.")
    if not backup_path.is_file():
        raise FileNotFoundError(f"Backup file does not exist: {backup_path}")

    source = sqlite3.connect(str(backup_path))
    try:
        _check_integrity(source)
    finally:
        source.close()

    target_path.parent.mkdir(parents=True, exist_ok=True)
    safety_path = None
    if target_path.exists():
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        safety_path = target_path.with_name(
            f"{target_path.stem}.pre-restore-{stamp}{target_path.suffix}"
        )
        create_sqlite_backup(target_path, safety_path)

    temp_path = target_path.with_name(target_path.name + ".restore-tmp")
    if temp_path.exists():
        raise FileExistsError(f"Temporary restore file already exists: {temp_path}")
    destination = sqlite3.connect(str(temp_path))
    destination_open = True
    complete = False
    try:
        source = sqlite3.connect(str(backup_path))
        try:
            source.backup(destination)
        finally:
            source.close()
        _check_integrity(destination)
        destination.close()
        destination_open = False
        os.replace(temp_path, target_path)
        complete = True
    finally:
        if destination_open:
            destination.close()
        if not complete and temp_path.exists():
            temp_path.unlink()

    if os.name != "nt":
        target_path.chmod(0o600)
    return safety_path


def _default_backup_path() -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return BASE_DIR / "backups" / f"pestfree-{stamp}.db"


def main() -> None:
    parser = argparse.ArgumentParser(description="Back up or restore a SQLite database.")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create", help="Create a consistent SQLite snapshot.")
    create.add_argument("--output", type=Path, default=_default_backup_path())
    restore = commands.add_parser("restore", help="Restore a snapshot to DATABASE_URL.")
    restore.add_argument("--input", type=Path, required=True)
    restore.add_argument(
        "--yes", action="store_true", help="Skip the interactive restore confirmation."
    )
    args = parser.parse_args()

    database_path = sqlite_database_path()
    if args.command == "create":
        print(create_sqlite_backup(database_path, args.output))
        return

    if not args.yes:
        answer = input(
            f"Restore {args.input} over {database_path}? Type RESTORE to continue: "
        )
        if answer != "RESTORE":
            raise SystemExit("Restore cancelled.")
    safety_path = restore_sqlite_backup(args.input, database_path)
    if safety_path:
        print(f"Pre-restore safety backup: {safety_path}")
    print(f"Restored database: {database_path}")


if __name__ == "__main__":
    main()
