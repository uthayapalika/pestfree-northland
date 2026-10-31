from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class UserModel(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20))
    can_view_exact_location: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_topic: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    @property
    def has_notification_topic(self) -> bool:
        return bool(self.notification_topic)


class TrapLineModel(Base):
    __tablename__ = "trap_lines"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    general_area: Mapped[str] = mapped_column(String(120))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class TrapModel(Base):
    __tablename__ = "traps"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trap_line_id: Mapped[int] = mapped_column(ForeignKey("trap_lines.id"))
    code: Mapped[str] = mapped_column(String(30))
    trap_type: Mapped[str] = mapped_column(String(20))
    general_area: Mapped[str] = mapped_column(String(120))
    exact_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    exact_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_sensitive: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(30), default="active")
    inspection_interval_days: Mapped[int] = mapped_column(Integer, default=14)


class InventoryItemModel(Base):
    __tablename__ = "inventory_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    category: Mapped[str] = mapped_column(String(30), default="bait")
    unit: Mapped[str] = mapped_column(String(20), default="items")
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class InventoryMovementModel(Base):
    __tablename__ = "inventory_movements"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    quantity_change: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(200))
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class TrapMaintenanceModel(Base):
    __tablename__ = "trap_maintenance"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trap_id: Mapped[int] = mapped_column(ForeignKey("traps.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    performed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    notes: Mapped[str] = mapped_column(String(500))


class TrapCheckModel(Base):
    __tablename__ = "trap_checks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trap_id: Mapped[int] = mapped_column(ForeignKey("traps.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    checked_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    status: Mapped[str] = mapped_column(String(20))
    notes: Mapped[str] = mapped_column(String(500), default="")


class CatchModel(Base):
    __tablename__ = "catches"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    check_id: Mapped[int] = mapped_column(ForeignKey("trap_checks.id"))
    trap_id: Mapped[int] = mapped_column(ForeignKey("traps.id"))
    species: Mapped[str] = mapped_column(String(30))
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AuditLogModel(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    actor_name: Mapped[str] = mapped_column(String(80))
    action: Mapped[str] = mapped_column(String(20))
    entity_type: Mapped[str] = mapped_column(String(30))
    entity_id: Mapped[int] = mapped_column(Integer)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    before: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    after: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class TrapLineAssignmentModel(Base):
    __tablename__ = "trap_line_assignments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trap_line_id: Mapped[int] = mapped_column(ForeignKey("trap_lines.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assigned_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class FieldTaskModel(Base):
    __tablename__ = "field_tasks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trap_id: Mapped[Optional[int]] = mapped_column(ForeignKey("traps.id"), nullable=True)
    trap_line_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("trap_lines.id"), nullable=True
    )
    assigned_to: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assigned_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(120))
    notes: Mapped[str] = mapped_column(String(500), default="")
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class NeighborAssistRequestModel(Base):
    __tablename__ = "neighbor_assist_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_type: Mapped[str] = mapped_column(String(30))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assigned_to: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    assigned_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    general_area: Mapped[str] = mapped_column(String(120))
    details: Mapped[str] = mapped_column(String(1000))
    contact_phone: Mapped[str] = mapped_column(String(32), default="")
    preferred_time: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    inventory_item_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("inventory_items.id"), nullable=True
    )
    supply_quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="submitted")
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
