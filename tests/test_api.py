from tests.conftest import make_user


def test_register_login_and_me(client):
    h = make_user(client, "Test User", "t@example.com")
    me = client.get("/auth/me", headers=h).json()
    assert me["email"] == "t@example.com" and me["role"] == "volunteer"
    assert "password" not in me and "password_hash" not in me


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
    assert seen["exact_lat"] is None and seen["general_area"] == "Hills"
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
