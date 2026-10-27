from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
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
