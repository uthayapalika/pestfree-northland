"""Send a daily digest of traps needing checks or follow-up."""

from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.ntfy import NTFY_TOPIC, send_ntfy
from app.config import DUE_AFTER_DAYS, OVERDUE_AFTER_DAYS
from app.db.database import SessionLocal
from app.db.models import (
    TrapCheckModel,
    TrapLineAssignmentModel,
    TrapLineModel,
    TrapModel,
    UserModel,
)

ATTENTION_CHECK_RESULTS = {"bait_needed", "sprung"}
ATTENTION_TRAP_STATUSES = {
    "needs_bait",
    "damaged",
    "missing",
    "under_maintenance",
}


def collect_trap_reminders(
    db: Session,
    today: date | None = None,
    due_after_days: int = DUE_AFTER_DAYS,
    overdue_after_days: int = OVERDUE_AFTER_DAYS,
) -> list[dict]:
    """Return unique trap reminders using each trap's latest check."""
    if not 0 < due_after_days < overdue_after_days:
        raise ValueError(
            "due_after_days and overdue_after_days must be positive, "
            "with due_after_days lower than overdue_after_days."
        )

    today = today or datetime.now(timezone.utc).date()
    latest_status = (
        select(TrapCheckModel.status)
        .where(TrapCheckModel.trap_id == TrapModel.id)
        .order_by(TrapCheckModel.checked_at.desc(), TrapCheckModel.id.desc())
        .limit(1)
        .scalar_subquery()
    )
    latest_checked_at = (
        select(TrapCheckModel.checked_at)
        .where(TrapCheckModel.trap_id == TrapModel.id)
        .order_by(TrapCheckModel.checked_at.desc(), TrapCheckModel.id.desc())
        .limit(1)
        .scalar_subquery()
    )
    rows = db.execute(
        select(
            TrapLineModel.id,
            TrapModel.code,
            TrapModel.status,
            TrapLineModel.name,
            latest_status.label("last_status"),
            latest_checked_at.label("last_checked_at"),
        ).join(TrapLineModel, TrapModel.trap_line_id == TrapLineModel.id)
    )

    reminders = []
    for line_id, code, trap_status, line_name, last_status, checked_at in rows:
        reasons = []
        if checked_at is None:
            reasons.append("Never checked")
        else:
            checked_date = checked_at.date()
            days_since_check = max((today - checked_date).days, 0)
            if days_since_check >= overdue_after_days:
                reasons.append(f"Overdue ({days_since_check} days)")
            elif days_since_check >= due_after_days:
                reasons.append(f"Due ({days_since_check} days)")

        if last_status in ATTENTION_CHECK_RESULTS:
            reasons.append(last_status.replace("_", " ").capitalize())
        if trap_status in ATTENTION_TRAP_STATUSES:
            reasons.append(trap_status.replace("_", " ").capitalize())

        if reasons:
            reminders.append(
                {
                    "trap": code,
                    "trap_line": line_name,
                    "trap_line_id": line_id,
                    "reasons": reasons,
                }
            )
    return reminders


def build_reminder_message(reminders: list[dict], detail_limit: int = 20) -> str:
    if not reminders:
        return ""
    details = [
        f"{item['trap']} ({item['trap_line']}): {', '.join(item['reasons'])}"
        for item in reminders[:detail_limit]
    ]
    remaining = len(reminders) - len(details)
    if remaining:
        details.append(f"...and {remaining} more trap(s)")
    return (
        f"{len(reminders)} trap(s) need a check or follow-up:\n"
        + "\n".join(details)
    )


def send_daily_reminder(
    db: Session,
    sender=send_ntfy,
    today: date | None = None,
) -> int:
    reminders = collect_trap_reminders(db, today=today)
    if not reminders:
        return 0

    assigned_rows = db.execute(
        select(
            TrapLineAssignmentModel.trap_line_id,
            UserModel.id,
            UserModel.notification_topic,
        ).join(UserModel, UserModel.id == TrapLineAssignmentModel.user_id)
    )
    topics_by_line: dict[int, list[str | None]] = {}
    for line_id, _, topic in assigned_rows:
        topics_by_line.setdefault(line_id, []).append(topic)

    personal_digests: dict[str, list[dict]] = {}
    general_digest = []
    for reminder in reminders:
        topics = topics_by_line.get(reminder["trap_line_id"], [])
        personal_topics = {topic for topic in topics if topic}
        if personal_topics:
            for topic in personal_topics:
                personal_digests.setdefault(topic, []).append(reminder)
            if any(not topic for topic in topics):
                general_digest.append(reminder)
        else:
            general_digest.append(reminder)

    if not NTFY_TOPIC and general_digest:
        raise RuntimeError(
            "Some trap reminders have no assigned personal notification topic, "
            "and NTFY_TOPIC is not configured."
        )
    for topic, topic_reminders in personal_digests.items():
        sender(
            "Daily trap check reminder",
            build_reminder_message(topic_reminders),
            priority=4,
            tags=["warning"],
            topic=topic,
        )
    if general_digest and NTFY_TOPIC:
        sender(
            "Daily trap check reminder",
            build_reminder_message(general_digest),
            priority=4,
            tags=["warning"],
            topic=NTFY_TOPIC,
        )
    return len(reminders)


def main() -> None:
    db = SessionLocal()
    try:
        count = send_daily_reminder(db)
    finally:
        db.close()
    if count:
        print(f"Sent a reminder covering {count} trap(s).")
    else:
        print("No traps need a check or follow-up today; no notification sent.")


if __name__ == "__main__":
    main()
