import json
import os
import zipfile

from app.backups import BACKUP_NAME


def test_coordinator_can_create_list_and_download_backup(client, coord, tmp_path, monkeypatch):
    monkeypatch.setenv("BACKUP_DIR", str(tmp_path))
    monkeypatch.setenv("BACKUP_RETENTION_COUNT", "3")

    created = client.post("/backups/create", headers=coord)
    assert created.status_code == 200
    body = created.json()
    assert BACKUP_NAME.fullmatch(body["filename"])
    assert body["tables"]["users"] >= 1

    listed = client.get("/backups", headers=coord)
    assert listed.status_code == 200
    assert listed.json()[0]["filename"] == body["filename"]

    downloaded = client.get(f"/backups/{body['filename']}", headers=coord)
    assert downloaded.status_code == 200
    assert downloaded.headers["content-type"] == "application/zip"
    archive_path = tmp_path / body["filename"]
    assert archive_path.is_file()
    with zipfile.ZipFile(archive_path) as archive:
        assert "manifest.json" in archive.namelist()
        manifest = json.loads(archive.read("manifest.json"))
        assert manifest["format"] == "pestfree-db-backup-v1"


def test_backup_endpoints_require_coordinator(client, vol, tmp_path, monkeypatch):
    monkeypatch.setenv("BACKUP_DIR", str(tmp_path))

    assert client.post("/backups/create", headers=vol).status_code == 403
    assert client.get("/backups", headers=vol).status_code == 403


def test_backup_cron_token_can_create_backup(client, tmp_path, monkeypatch):
    monkeypatch.setenv("BACKUP_DIR", str(tmp_path))
    monkeypatch.setenv("BACKUP_CRON_TOKEN", "test-secret")

    response = client.post(
        "/backups/create", headers={"X-Backup-Cron-Key": "test-secret"}
    )
    assert response.status_code == 200
