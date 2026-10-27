from contextlib import closing
import sqlite3
from pathlib import Path

import pytest

from app.backup import create_sqlite_backup, restore_sqlite_backup


def _create_database(path: Path, value: str) -> None:
    with closing(sqlite3.connect(path)) as db:
        db.execute("CREATE TABLE records (value TEXT NOT NULL)")
        db.execute("INSERT INTO records VALUES (?)", (value,))
        db.commit()


def test_backup_and_restore_preserve_data_and_create_safety_copy(tmp_path):
    database = tmp_path / "tracker.db"
    backup = tmp_path / "backup.db"
    _create_database(database, "before")

    create_sqlite_backup(database, backup)
    with closing(sqlite3.connect(database)) as db:
        db.execute("UPDATE records SET value = 'after'")
        db.commit()

    safety_copy = restore_sqlite_backup(backup, database)

    assert safety_copy is not None and safety_copy.is_file()
    with closing(sqlite3.connect(database)) as db:
        assert db.execute("SELECT value FROM records").fetchone() == ("before",)
    with closing(sqlite3.connect(safety_copy)) as db:
        assert db.execute("SELECT value FROM records").fetchone() == ("after",)


def test_backup_does_not_overwrite_existing_file(tmp_path):
    database = tmp_path / "tracker.db"
    backup = tmp_path / "backup.db"
    _create_database(database, "before")
    backup.write_text("keep this file", encoding="utf-8")

    with pytest.raises(FileExistsError):
        create_sqlite_backup(database, backup)

    assert backup.read_text(encoding="utf-8") == "keep this file"


def test_restore_rejects_invalid_backup_without_changing_database(tmp_path):
    database = tmp_path / "tracker.db"
    invalid_backup = tmp_path / "invalid.db"
    _create_database(database, "keep")
    invalid_backup.write_text("not a database", encoding="utf-8")

    with pytest.raises(sqlite3.DatabaseError):
        restore_sqlite_backup(invalid_backup, database)

    with closing(sqlite3.connect(database)) as db:
        assert db.execute("SELECT value FROM records").fetchone() == ("keep",)


def test_backup_rejects_same_input_and_output(tmp_path):
    database = tmp_path / "tracker.db"
    _create_database(database, "value")

    with pytest.raises(ValueError):
        create_sqlite_backup(database, database)
