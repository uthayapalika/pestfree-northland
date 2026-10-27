def _create_worker(client, coord, name, email, role="field_worker"):
    response = client.post(
        "/users",
        headers=coord,
        json={
            "name": name,
            "email": email,
            "password": "Passw0rd123",
            "role": role,
        },
    )
    assert response.status_code == 201
    login = client.post(
        "/auth/login",
        json={"email": email, "password": "Passw0rd123"},
    )
    assert login.status_code == 200
    return response.json(), {"Authorization": f"Bearer {login.json()['access_token']}"}


def _create_line(client, coord, name="North line"):
    response = client.post(
        "/trap-lines",
        headers=coord,
        json={"name": name, "general_area": "Northland"},
    )
    assert response.status_code == 201
    return response.json()


def test_task_assignment_and_audit_access(client, coord, vol, monkeypatch):
    from app.api import tasks as tasks_api

    monkeypatch.setattr(tasks_api, "NTFY_TOPIC", "")
    worker, worker_headers = _create_worker(
        client, coord, "Field Worker", "field@example.com"
    )
    line = _create_line(client, coord)
    assignment = client.post(
        f"/trap-lines/{line['id']}/assignments",
        headers=coord,
        json={"user_id": worker["id"]},
    )
    assert assignment.status_code == 201
    task = client.post(
        "/tasks",
        headers=coord,
        json={
            "trap_line_id": line["id"],
            "assigned_to": worker["id"],
            "title": "Check the northern traps",
            "notes": "Bring replacement bait",
        },
    )
    assert task.status_code == 201
    assert [item["id"] for item in client.get("/tasks", headers=worker_headers).json()] == [
        task.json()["id"]
    ]
    assert len(client.get("/my/trap-line-assignments", headers=worker_headers).json()) == 1
    completed = client.patch(
        f"/tasks/{task.json()['id']}",
        headers=worker_headers,
        json={"status": "completed"},
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"

    assert client.get("/audit", headers=coord).status_code == 200
    assert client.get("/audit", headers=vol).status_code == 403


def test_task_rejects_trap_from_a_different_line(client, coord):
    worker, _ = _create_worker(client, coord, "Worker", "mismatch@example.com")
    line = _create_line(client, coord, "Line One")
    other_line = _create_line(client, coord, "Line Two")
    trap = client.post(
        f"/trap-lines/{other_line['id']}/traps",
        headers=coord,
        json={"trap_type": "rat", "general_area": "Northland"},
    ).json()
    response = client.post(
        "/tasks",
        headers=coord,
        json={
            "trap_line_id": line["id"],
            "trap_id": trap["id"],
            "assigned_to": worker["id"],
            "title": "Check mismatched trap",
        },
    )
    assert response.status_code == 400
    assert "does not belong" in response.json()["detail"]


def test_bulk_trap_import_is_atomic_and_updates_only_when_confirmed(client, coord):
    line = _create_line(client, coord)
    valid_row = {
        "trap_line": line["name"],
        "code": "CSV-1",
        "trap_type": "rat",
        "is_sensitive": False,
    }
    initial = client.post(
        "/imports/traps",
        headers=coord,
        json={"rows": [valid_row]},
    )
    assert initial.status_code == 200
    assert initial.json() == {"created": 1, "updated": 0, "errors": []}

    duplicate = client.post(
        "/imports/traps",
        headers=coord,
        json={"rows": [valid_row]},
    )
    assert duplicate.json()["created"] == duplicate.json()["updated"] == 0
    assert duplicate.json()["errors"]

    update = client.post(
        "/imports/traps",
        headers=coord,
        json={"rows": [{**valid_row, "trap_type": "stoat"}], "update_existing": True},
    )
    assert update.json() == {"created": 0, "updated": 1, "errors": []}

    atomic = client.post(
        "/imports/traps",
        headers=coord,
        json={
            "rows": [
                {**valid_row, "code": "CSV-2"},
                {**valid_row, "code": "CSV-3", "trap_line": "Unknown line"},
            ]
        },
    )
    assert atomic.json()["created"] == atomic.json()["updated"] == 0
    assert atomic.json()["errors"]
    traps = client.get(
        f"/trap-lines/{line['id']}/traps",
        headers=coord,
    ).json()
    assert [trap["code"] for trap in traps] == ["CSV-1"]
