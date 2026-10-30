from datetime import date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AuditLogModel, CatchModel, TrapLineModel, TrapModel, UserModel


def audit_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def trap_snapshot(trap: TrapModel) -> dict:
    return {
        "code": trap.code,
        "trap_line_id": trap.trap_line_id,
        "trap_type": trap.trap_type,
        "general_area": trap.general_area,
        "exact_lat": trap.exact_lat,
        "exact_lng": trap.exact_lng,
        "is_sensitive": trap.is_sensitive,
        "status": trap.status,
    }


def user_snapshot(user: UserModel) -> dict:
    return {
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "can_view_exact_location": user.can_view_exact_location,
        "has_notification_topic": user.has_notification_topic,
    }


def catch_snapshot(catch: CatchModel) -> dict:
    return {
        "check_id": catch.check_id,
        "trap_id": catch.trap_id,
        "species": catch.species,
        "recorded_at": audit_value(catch.recorded_at),
    }


def record_audit(
    db: Session,
    actor: UserModel,
    action: str,
    entity_type: str,
    entity_id: int,
    before: dict | None,
    after: dict | None,
) -> None:
    db.add(
        AuditLogModel(
            actor_id=actor.id,
            actor_name=actor.name,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before=before,
            after=after,
        )
    )


def list_audit_logs(
    db: Session,
    limit: int = 100,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> list[AuditLogModel]:
    statement = select(AuditLogModel)
    if entity_type:
        statement = statement.where(AuditLogModel.entity_type == entity_type)
    if entity_id is not None:
        statement = statement.where(AuditLogModel.entity_id == entity_id)
    statement = statement.order_by(
        AuditLogModel.changed_at.desc(), AuditLogModel.id.desc()
    ).limit(limit)
    return list(db.scalars(statement))


def describe_entity(db: Session, entity_type: str, entity_id: int) -> str:
    if entity_type == "trap":
        trap = db.get(TrapModel, entity_id)
        return trap.code if trap else f"Trap {entity_id}"
    if entity_type == "user":
        user = db.get(UserModel, entity_id)
        return user.name if user else f"User {entity_id}"
    if entity_type == "catch":
        catch = db.get(CatchModel, entity_id)
        return f"{catch.species} catch" if catch else f"Catch {entity_id}"
    if entity_type == "neighbor_assist":
        return f"Neighbor Assist request {entity_id}"
    if entity_type == "trap_line":
        line = db.get(TrapLineModel, entity_id)
        return line.name if line else f"Trap line {entity_id}"
    return f"{entity_type} {entity_id}"
