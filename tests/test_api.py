from urllib.error import HTTPError

from app.api import auth as auth_api, ntfy
from tests.conftest import make_user


def test_register_login_and_me(client):
    h = make_user(client, "Test User", "t@example.com")
    me = client.get("/auth/me", headers=h).json()
    assert me["email"] == "t@example.com" and me["role"] == "volunteer"
    assert "password" not in me and "password_hash" not in me


def test_public_registration_is_always_enabled(client):
    assert client.get("/auth/registration-status").json() == {"enabled": True}


def test_hosted_public_registration_cannot_create_coordinator(client, monkeypatch):
    monkeypatch.setattr(auth_api, "IS_RENDER", True)
    response = client.post(
        "/auth/register",
        json={
            "name": "New Coordinator",
            "email": "newcoord@example.com",
            "password": "Passw0rd123",
            "role": "coordinator",
        },
    )
    assert response.status_code == 403
    assert "volunteer" in response.json()["detail"]


def test_duplicate_email_rejected(client):
    make_user(client, "A One", "dup@example.com")
    r = client.post(
        "/auth/register",
        json={"name": "A Two", "email": "dup@example.com", "password": "Passw0rd123"},
    )
    assert r.status_code == 409


def test_wrong_password_rejected(client):
    make_user(client, "A One", "a@example.com")
    r = client.post(
        "/auth/login", json={"email": "a@example.com", "password": "wrongpass"}
    )
    assert r.status_code == 401


def test_invalid_input_gives_422(client):
    r = client.post(
        "/auth/register", json={"name": "A", "email": "bad", "password": "123"}
    )
    assert r.status_code == 422


def test_protected_route_needs_token(client):
    assert client.get("/trap-lines").status_code == 401


def test_notification_test_reports_ntfy_rate_limit(client, coord, monkeypatch):
    def rate_limited(*args, **kwargs):
        raise HTTPError(
            "https://ntfy.sh",
            429,
            "Too Many Requests",
            {"Retry-After": "30"},
            None,
        )

    monkeypatch.setattr(ntfy, "send_ntfy", rate_limited)
    response = client.post("/notifications/test", json={}, headers=coord)

    assert response.status_code == 429
    assert "rate-limiting" in response.json()["detail"]
    assert "30 seconds" in response.json()["detail"]


def test_notification_test_requires_topic_when_not_configured(client, coord, monkeypatch):
    monkeypatch.setattr(ntfy, "NTFY_TOPIC", "")
    response = client.post("/notifications/test", json={}, headers=coord)

    assert response.status_code == 503
    assert "NTFY_TOPIC is not set" in response.json()["detail"]


def test_volunteer_cannot_create_trap_line(client, vol):
    r = client.post(
        "/trap-lines", json={"name": "Line", "general_area": "Area"}, headers=vol
    )
    assert r.status_code == 403


def _setup_sensitive_trap(client, coord):
    line = client.post(
        "/trap-lines",
        json={"name": "Line A", "general_area": "Northland"},
        headers=coord,
    ).json()
    trap = client.post(
        f"/trap-lines/{line['id']}/traps",
        headers=coord,
        json={
            "code": "T1",
            "trap_type": "stoat",
            "general_area": "Hills",
            "exact_lat": -35.5,
            "exact_lng": 174.1,
            "is_sensitive": True,
        },
    ).json()
    return line, trap


def test_sensitive_location_protection(client, coord, vol):
    line, trap = _setup_sensitive_trap(client, coord)
    url = f"/trap-lines/{line['id']}/traps"
    assert client.get(url, headers=coord).json()[0]["exact_lat"] == -35.5
    seen = client.get(url, headers=vol).json()[0]
    assert seen["exact_lat"] is None and seen["general_area"] == "Northland"
    vol_id = client.get("/auth/me", headers=vol).json()["id"]
    r = client.patch(
        f"/users/{vol_id}/location-access",
        json={"can_view_exact_location": True},
        headers=coord,
    )
    assert r.status_code == 200
    assert client.get(url, headers=vol).json()[0]["exact_lat"] == -35.5


def test_duplicate_trap_code_and_sensitive_needs_coordinates(client, coord):
    line, _ = _setup_sensitive_trap(client, coord)
    url = f"/trap-lines/{line['id']}/traps"
    dup = client.post(
        url,
        headers=coord,
        json={"code": "T1", "trap_type": "rat", "general_area": "Hills"},
    )
    assert dup.status_code == 409
    bad = client.post(
        url,
        headers=coord,
        json={
            "code": "T2",
            "trap_type": "rat",
            "general_area": "Hills",
            "is_sensitive": True,
        },
    )
    assert bad.status_code == 400


def test_trap_code_is_generated_and_preserved_when_omitted(client, coord):
    line = client.post(
        "/trap-lines",
        json={"name": "Auto Code Line", "general_area": "Northland"},
        headers=coord,
    ).json()
    url = f"/trap-lines/{line['id']}/traps"
    first = client.post(
        url,
        headers=coord,
        json={"trap_type": "rat", "general_area": "Hills"},
    )
    second = client.post(
        url,
        headers=coord,
        json={"trap_type": "stoat", "general_area": "Ridge"},
    )

    assert first.status_code == second.status_code == 201
    first_code = first.json()["code"]
    second_code = second.json()["code"]
    assert first_code.startswith("TRAP-")
    assert second_code.startswith("TRAP-") and second_code != first_code

    updated = client.put(
        f"/traps/{first.json()['id']}",
        headers=coord,
        json={"trap_type": "possum", "general_area": "Forest"},
    )
    assert updated.status_code == 200
    traps = client.get(url, headers=coord).json()
    assert next(t for t in traps if t["id"] == first.json()["id"])["code"] == first_code


def test_all_catch_species_are_supported_as_trap_types(client, coord):
    line = client.post(
        "/trap-lines",
        json={"name": "Species Line", "general_area": "Northland"},
        headers=coord,
    ).json()
    for species in ("mouse", "hedgehog", "other"):
        created = client.post(
            f"/trap-lines/{line['id']}/traps",
            headers=coord,
            json={"trap_type": species, "general_area": "Hills"},
        )
        assert created.status_code == 201
        assert created.json()["trap_type"] == species
        updated = client.put(
            f"/traps/{created.json()['id']}",
            headers=coord,
            json={"trap_type": species, "general_area": "Ridge"},
        )
        assert updated.status_code == 200


def test_traps_inherit_general_area_from_trap_line(client, coord):
    line = client.post(
        "/trap-lines",
        json={"name": "North Track", "general_area": "Northland"},
        headers=coord,
    ).json()
    created = client.post(
        f"/trap-lines/{line['id']}/traps",
        headers=coord,
        json={
            "trap_type": "rat",
            "general_area": "Obsolete duplicate area",
        },
    )
    assert created.status_code == 201
    assert created.json()["general_area"] == "Northland"

    client.put(
        f"/trap-lines/{line['id']}",
        headers=coord,
        json={"name": "North Track", "general_area": "Updated Northland"},
    )
    listed = client.get(f"/trap-lines/{line['id']}/traps", headers=coord)
    assert listed.json()[0]["general_area"] == "Updated Northland"


def test_check_catch_and_last_status(client, coord, vol):
    line, trap = _setup_sensitive_trap(client, coord)
    check = client.post(
        f"/traps/{trap['id']}/checks",
        json={"status": "caught", "notes": "Stoat"},
        headers=vol,
    )
    assert check.status_code == 201
    catch = client.post(
        f"/checks/{check.json()['id']}/catches", json={"species": "stoat"}, headers=vol
    )
    assert catch.status_code == 201 and catch.json()["trap_id"] == trap["id"]
    listing = client.get(f"/trap-lines/{line['id']}/traps", headers=vol).json()
    assert listing[0]["last_status"] == "caught"


def test_catch_requires_caught_status(client, coord, vol):
    _, trap = _setup_sensitive_trap(client, coord)
    check = client.post(
        f"/traps/{trap['id']}/checks", json={"status": "empty"}, headers=vol
    ).json()
    r = client.post(
        f"/checks/{check['id']}/catches", json={"species": "rat"}, headers=vol
    )
    assert r.status_code == 400


def test_catch_crud(client, coord, vol):
    _, trap = _setup_sensitive_trap(client, coord)
    created = client.post(
        "/catches",
        json={
            "trap_id": trap["id"],
            "species": "stoat",
            "notes": "Caught near the ridge",
        },
        headers=vol,
    )
    assert created.status_code == 201
    catch = created.json()
    assert catch["trap_id"] == trap["id"] and catch["species"] == "stoat"

    listing = client.get("/catches", headers=coord)
    assert listing.status_code == 200 and listing.json()[0]["id"] == catch["id"]
    listed_catch = listing.json()[0]
    assert listed_catch["trap_code"] == trap["code"]
    assert listed_catch["trap_line_id"] == trap["trap_line_id"]
    assert listed_catch["trap_line"] == "Line A"
    assert listed_catch["recorded_by"] == "Vol One"
    assert client.put(
        f"/catches/{catch['id']}", json={"species": "rat"}, headers=vol
    ).status_code == 403
    updated = client.put(
        f"/catches/{catch['id']}", json={"species": "rat"}, headers=coord
    )
    assert updated.status_code == 200 and updated.json()["species"] == "rat"
    assert client.delete(f"/catches/{catch['id']}", headers=coord).status_code == 204
    assert client.get("/catches", headers=coord).json() == []


def test_trap_update_enforces_sensitive_coordinates_and_unique_code(client, coord):
    line, first = _setup_sensitive_trap(client, coord)
    second = client.post(
        f"/trap-lines/{line['id']}/traps",
        headers=coord,
        json={"code": "T2", "trap_type": "rat", "general_area": "Hills"},
    ).json()

    missing_coordinates = client.put(
        f"/traps/{second['id']}",
        headers=coord,
        json={
            "code": "T2",
            "trap_type": "rat",
            "general_area": "Hills",
            "is_sensitive": True,
        },
    )
    assert missing_coordinates.status_code == 400
    duplicate_code = client.put(
        f"/traps/{second['id']}",
        headers=coord,
        json={
            "code": first["code"],
            "trap_type": "rat",
            "general_area": "Hills",
        },
    )
    assert duplicate_code.status_code == 409


def test_trap_and_line_crud(client, coord):
    line = client.post(
        "/trap-lines",
        headers=coord,
        json={"name": "Line A", "general_area": "Northland"},
    ).json()
    updated_line = client.put(
        f"/trap-lines/{line['id']}",
        headers=coord,
        json={"name": "Line Updated", "general_area": "Upper Northland"},
    )
    assert updated_line.status_code == 200
    assert updated_line.json()["name"] == "Line Updated"

    trap = client.post(
        f"/trap-lines/{line['id']}/traps",
        headers=coord,
        json={"code": "T1", "trap_type": "rat", "general_area": "Hills"},
    ).json()
    updated_trap = client.put(
        f"/traps/{trap['id']}",
        headers=coord,
        json={
            "code": "T2",
            "trap_type": "stoat",
            "general_area": "Ridge",
            "is_sensitive": False,
        },
    )
    assert updated_trap.status_code == 200
    assert client.post(
        f"/traps/{trap['id']}/maintenance",
        headers=coord,
        json={"notes": "Cleaned the trap"},
    ).status_code == 201
    assert client.delete(f"/traps/{trap['id']}", headers=coord).status_code == 204
    assert client.delete(f"/trap-lines/{line['id']}", headers=coord).status_code == 204


def test_trap_status_and_maintenance_records(client, coord, vol):
    line, trap = _setup_sensitive_trap(client, coord)
    assert trap["status"] == "active"

    updated = client.put(
        f"/traps/{trap['id']}",
        headers=coord,
        json={"trap_type": "stoat", "status": "under_maintenance"},
    )
    assert updated.status_code == 200
    assert client.put(
        f"/traps/{trap['id']}",
        headers=coord,
        json={"trap_type": "stoat"},
    ).status_code == 200
    listing = client.get(f"/trap-lines/{line['id']}/traps", headers=coord).json()
    assert listing[0]["status"] == "under_maintenance"

    created = client.post(
        f"/traps/{trap['id']}/maintenance",
        headers=coord,
        json={"notes": "Replaced the spring", "performed_at": "2026-10-25T10:30:00"},
    )
    assert created.status_code == 201
    assert created.json()["notes"] == "Replaced the spring"
    assert created.json()["recorded_by"] == "Coord One"
    assert client.get(
        f"/traps/{trap['id']}/maintenance", headers=vol
    ).json()[0]["notes"] == "Replaced the spring"
    assert client.post(
        f"/traps/{trap['id']}/maintenance",
        headers=vol,
        json={"notes": "Checked trap"},
    ).status_code == 403
    assert client.put(
        f"/traps/{trap['id']}",
        headers=coord,
        json={"trap_type": "stoat", "status": "unknown"},
    ).status_code == 422


def test_coordinator_user_crud(client, coord):
    created = client.post(
        "/users",
        headers=coord,
        json={
            "name": "Volunteer Two",
            "email": "vol2@example.com",
            "password": "Passw0rd123",
            "role": "volunteer",
        },
    )
    assert created.status_code == 201
    user_id = created.json()["id"]
    assert client.get("/users", headers=coord).status_code == 200

    updated = client.put(
        f"/users/{user_id}",
        headers=coord,
        json={
            "name": "Volunteer Updated",
            "email": "vol2@example.com",
            "role": "coordinator",
            "can_view_exact_location": True,
        },
    )
    assert updated.status_code == 200
    assert client.delete(f"/users/{user_id}", headers=coord).status_code == 204


def test_field_worker_role_permissions(client, coord):
    _, trap = _setup_sensitive_trap(client, coord)
    created = client.post(
        "/users",
        headers=coord,
        json={
            "name": "Field Worker",
            "email": "field@example.com",
            "password": "Passw0rd123",
            "role": "field_worker",
        },
    )
    assert created.status_code == 201
    assert created.json()["role"] == "field_worker"
    token = client.post(
        "/auth/login",
        json={"email": "field@example.com", "password": "Passw0rd123"},
    ).json()["access_token"]
    field_worker = {"Authorization": f"Bearer {token}"}

    check = client.post(
        f"/traps/{trap['id']}/checks",
        headers=field_worker,
        json={"status": "caught"},
    )
    assert check.status_code == 201
    assert client.post(
        f"/checks/{check.json()['id']}/catches",
        headers=field_worker,
        json={"species": "stoat"},
    ).status_code == 201
    assert client.get("/trap-lines", headers=field_worker).status_code == 200
    assert client.get("/catches", headers=field_worker).status_code == 403
    assert client.get(f"/traps/{trap['id']}/checks", headers=field_worker).status_code == 403
    assert client.get(f"/traps/{trap['id']}/history", headers=field_worker).status_code == 403
    assert client.get(f"/traps/{trap['id']}/maintenance", headers=field_worker).status_code == 403
    assert client.get("/users", headers=field_worker).status_code == 403
    assert client.get("/reports/catches", headers=field_worker).status_code == 403
    assert client.get("/notifications/info", headers=field_worker).status_code == 403
    assert client.post(
        "/auth/register",
        json={
            "name": "Public Field Worker",
            "email": "public-field@example.com",
            "password": "Passw0rd123",
            "role": "field_worker",
        },
    ).status_code == 422


def test_invalid_status_and_unknown_trap(client, vol, coord):
    _, trap = _setup_sensitive_trap(client, coord)
    assert (
        client.post(
            f"/traps/{trap['id']}/checks", json={"status": "broken"}, headers=vol
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/traps/999/checks", json={"status": "empty"}, headers=vol
        ).status_code
        == 404
    )


def test_reports_by_line_and_month(client, coord, vol):
    line, trap = _setup_sensitive_trap(client, coord)
    for _ in range(2):
        c = client.post(
            f"/traps/{trap['id']}/checks", json={"status": "caught"}, headers=vol
        ).json()
        client.post(
            f"/checks/{c['id']}/catches", json={"species": "stoat"}, headers=vol
        )
    by_line = client.get("/reports/catches?group=line", headers=coord).json()
    assert by_line["total"] == 2 and by_line["rows"] == [
        {"label": "Line A", "catches": 2}
    ]
    by_month = client.get("/reports/catches?group=month", headers=coord).json()
    assert by_month["rows"][0]["catches"] == 2
    assert client.get("/reports/catches?group=line", headers=vol).status_code == 403
    assert client.get("/reports/catches?group=year", headers=coord).status_code == 422


def test_trap_history_includes_check_catch_and_recorder(client, coord, vol):
    _, trap = _setup_sensitive_trap(client, coord)
    check = client.post(
        f"/traps/{trap['id']}/checks",
        json={"status": "caught", "notes": "Near the stream"},
        headers=vol,
    ).json()
    client.post(
        f"/checks/{check['id']}/catches", json={"species": "stoat"}, headers=vol
    )

    history = client.get(f"/traps/{trap['id']}/history", headers=coord)
    assert history.status_code == 200
    assert history.json()[0]["status"] == "caught"
    assert history.json()[0]["notes"] == "Near the stream"
    assert history.json()[0]["recorded_by"] == "Vol One"
    assert history.json()[0]["species"] == ["stoat"]
    assert client.get(f"/traps/{trap['id']}/history", headers=vol).status_code == 200
    assert client.get("/traps/999/history", headers=coord).status_code == 404
    assert client.get(f"/traps/{trap['id']}/history").status_code == 401
