from datetime import date, datetime

import pytest

from app.db.database import SessionLocal
from app.api import ntfy
import app.reminders as reminders
from app.reminders import (
    build_reminder_message,
    collect_trap_reminders,
    send_daily_reminder,
)


def _create_trap(client, headers, line_id, code, status="active"):
    response = client.post(
        f"/trap-lines/{line_id}/traps",
        headers=headers,
        json={
            "code": code,
            "trap_type": "rat",
            "general_area": "Northland",
            "status": status,
        },
    )
    assert response.status_code == 201
    return response.json()


def _add_check(client, headers, trap_id, checked_at, status="empty"):
    response = client.post(
        f"/traps/{trap_id}/checks",
        headers=headers,
        json={"status": status, "checked_at": checked_at.isoformat()},
    )
    assert response.status_code == 201


def test_reminders_include_never_due_overdue_and_attention_only(client, coord):
    line = client.post(
        "/trap-lines",
        headers=coord,
        json={"name": "North line", "general_area": "Northland"},
    ).json()
    today = date(2026, 10, 27)
    old = datetime(2026, 9, 10, 10)
    due = datetime(2026, 10, 5, 10)
    recent = datetime(2026, 10, 26, 10)
    overdue_trap = _create_trap(client, coord, line["id"], "OVERDUE")
    due_trap = _create_trap(client, coord, line["id"], "DUE")
    _create_trap(client, coord, line["id"], "NEVER")
    attention_trap = _create_trap(client, coord, line["id"], "BAIT")
    _add_check(client, coord, overdue_trap["id"], old)
    _add_check(client, coord, due_trap["id"], due)
    _add_check(client, coord, attention_trap["id"], recent, status="bait_needed")

    db = SessionLocal()
    try:
        reminders = collect_trap_reminders(db, today=today)
        sent = []
        count = send_daily_reminder(
            db,
            sender=lambda title, message, **kwargs: sent.append(
                (title, message, kwargs)
            ),
            today=today,
        )
    finally:
        db.close()

    by_code = {item["trap"]: item for item in reminders}
    assert count == len(by_code) == 4
    assert len(sent) == 1
    assert sent[0][0] == "Daily trap check reminder"
    assert "OVERDUE (North line)" in sent[0][1]
    assert sent[0][2] == {
        "priority": 4,
        "tags": ["warning"],
        "topic": ntfy.NTFY_TOPIC,
    }
    assert by_code["OVERDUE"]["reasons"] == ["Overdue (47 days)"]
    assert by_code["DUE"]["reasons"] == ["Due (22 days)"]
    assert by_code["NEVER"]["reasons"] == ["Never checked"]
    assert by_code["BAIT"]["reasons"] == ["Bait needed"]
    assert all("exact_lat" not in item and "exact_lng" not in item for item in reminders)


def test_reminders_route_to_assigned_workers_and_global_fallback(
    client, coord, monkeypatch
):
    monkeypatch.setattr(reminders, "NTFY_TOPIC", "global-topic")
    line = client.post(
        "/trap-lines",
        headers=coord,
        json={"name": "Assigned line", "general_area": "Northland"},
    ).json()
    _create_trap(client, coord, line["id"], "ASSIGNED")
    personal = client.post(
        "/users",
        headers=coord,
        json={
            "name": "Worker One",
            "email": "worker1@example.com",
            "password": "Passw0rd123",
            "role": "field_worker",
        },
    )
    fallback = client.post(
        "/users",
        headers=coord,
        json={
            "name": "Worker Two",
            "email": "worker2@example.com",
            "password": "Passw0rd123",
            "role": "volunteer",
        },
    )
    assert personal.status_code == fallback.status_code == 201
    worker_headers = client.post(
        "/auth/login",
        json={"email": "worker1@example.com", "password": "Passw0rd123"},
    ).json()
    personal_token = worker_headers["access_token"]
    personal_headers = {"Authorization": f"Bearer {personal_token}"}
    topic_response = client.put(
        "/users/me/notification-topic",
        headers=personal_headers,
        json={"topic": "worker-one-topic"},
    )
    assert topic_response.status_code == 200
    assert topic_response.json()["has_notification_topic"] is True
    assert "notification_topic" not in topic_response.json()
    for user in (personal.json(), fallback.json()):
        assigned = client.post(
            f"/trap-lines/{line['id']}/assignments",
            headers=coord,
            json={"user_id": user["id"]},
        )
        assert assigned.status_code == 201

    db = SessionLocal()
    sent = []
    try:
        count = send_daily_reminder(
            db,
            sender=lambda title, message, **kwargs: sent.append((message, kwargs)),
            today=date(2026, 10, 27),
        )
    finally:
        db.close()

    assert count == 1
    assert {kwargs["topic"] for _, kwargs in sent} == {
        "worker-one-topic",
        "global-topic",
    }
    assert all("ASSIGNED" in message for message, _ in sent)
    assert all("exact_lat" not in message and "exact_lng" not in message for message, _ in sent)


def test_latest_check_controls_reminder_and_message_is_limited(client, coord):
    line = client.post(
        "/trap-lines",
        headers=coord,
        json={"name": "North line", "general_area": "Northland"},
    ).json()
    trap = _create_trap(client, coord, line["id"], "RECENT")
    _add_check(client, coord, trap["id"], datetime(2026, 9, 1, 10), status="bait_needed")
    _add_check(client, coord, trap["id"], datetime(2026, 10, 26, 10))

    db = SessionLocal()
    sent = []
    try:
        reminders = collect_trap_reminders(db, today=date(2026, 10, 27))
        count = send_daily_reminder(
            db,
            sender=lambda *args, **kwargs: sent.append((args, kwargs)),
            today=date(2026, 10, 27),
        )
    finally:
        db.close()

    assert reminders == []
    assert count == 0
    assert sent == []
    message = build_reminder_message(
        [{"trap": f"T{index}", "trap_line": "Line", "reasons": ["Never checked"]}
         for index in range(25)]
    )
    assert message.startswith("25 trap(s)")
    assert "...and 5 more trap(s)" in message


def test_reminders_require_valid_due_thresholds(client):
    db = SessionLocal()
    try:
        with pytest.raises(ValueError, match="due_after_days"):
            collect_trap_reminders(
                db,
                today=date(2026, 10, 27),
                due_after_days=30,
                overdue_after_days=14,
            )
    finally:
        db.close()
