from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    CatchModel,
    TrapCheckModel,
    TrapLineModel,
    TrapModel,
    UserModel,
)
from app.domain.trap_factory import TrapFactory
from app.domain.traps import Trap


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> Optional[UserModel]:
        return self.db.get(UserModel, user_id)

    def get_by_email(self, email: str) -> Optional[UserModel]:
        return self.db.scalar(select(UserModel).where(UserModel.email == email))

    def list_all(self) -> list[UserModel]:
        return list(self.db.scalars(select(UserModel).order_by(UserModel.id)))

    def add(
        self, name, email, password_hash, role, can_view_exact_location=False
    ) -> UserModel:
        user = UserModel(
            name=name,
            email=email,
            password_hash=password_hash,
            role=role,
            can_view_exact_location=can_view_exact_location,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def save(self, user: UserModel) -> UserModel:
        self.db.commit()
        self.db.refresh(user)
        return user


class TrapLineRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, name, general_area, created_by) -> TrapLineModel:
        line = TrapLineModel(
            name=name, general_area=general_area, created_by=created_by
        )
        self.db.add(line)
        self.db.commit()
        self.db.refresh(line)
        return line

    def get(self, line_id: int) -> Optional[TrapLineModel]:
        return self.db.get(TrapLineModel, line_id)

    def list_all(self) -> list[TrapLineModel]:
        return list(self.db.scalars(select(TrapLineModel).order_by(TrapLineModel.id)))


class TrapRepository:
    """Returns domain objects (Trap subclasses), never raw database rows."""

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _to_domain(row: TrapModel) -> Trap:
        return TrapFactory.create(
            row.trap_type,
            id=row.id,
            code=row.code,
            trap_line_id=row.trap_line_id,
            general_area=row.general_area,
            exact_lat=row.exact_lat,
            exact_lng=row.exact_lng,
            is_sensitive=row.is_sensitive,
        )

    def add(
        self,
        trap_line_id,
        code,
        trap_type,
        general_area,
        exact_lat,
        exact_lng,
        is_sensitive,
    ) -> Trap:
        row = TrapModel(
            trap_line_id=trap_line_id,
            code=code,
            trap_type=trap_type,
            general_area=general_area,
            exact_lat=exact_lat,
            exact_lng=exact_lng,
            is_sensitive=is_sensitive,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return self._to_domain(row)

    def get(self, trap_id: int) -> Optional[Trap]:
        row = self.db.get(TrapModel, trap_id)
        return self._to_domain(row) if row else None

    def list_by_line(self, line_id: int) -> list[Trap]:
        rows = self.db.scalars(
            select(TrapModel)
            .where(TrapModel.trap_line_id == line_id)
            .order_by(TrapModel.id)
        )
        return [self._to_domain(r) for r in rows]

    def code_exists(self, line_id: int, code: str) -> bool:
        stmt = select(TrapModel.id).where(
            TrapModel.trap_line_id == line_id, TrapModel.code == code
        )
        return self.db.scalar(stmt) is not None


class CheckRepository:
    def __init__(self, db: Session):
        self.db = db

    def add_check(
        self, trap_id, user_id, status, notes, checked_at: Optional[datetime]
    ) -> TrapCheckModel:
        check = TrapCheckModel(
            trap_id=trap_id, user_id=user_id, status=status, notes=notes
        )
        if checked_at is not None:
            check.checked_at = checked_at
        self.db.add(check)
        self.db.commit()
        self.db.refresh(check)
        return check

    def get_check(self, check_id: int) -> Optional[TrapCheckModel]:
        return self.db.get(TrapCheckModel, check_id)

    def list_for_trap(self, trap_id: int) -> list[TrapCheckModel]:
        stmt = (
            select(TrapCheckModel)
            .where(TrapCheckModel.trap_id == trap_id)
            .order_by(TrapCheckModel.checked_at.desc(), TrapCheckModel.id.desc())
        )
        return list(self.db.scalars(stmt))

    def last_for_trap(self, trap_id: int) -> Optional[TrapCheckModel]:
        rows = self.list_for_trap(trap_id)
        return rows[0] if rows else None

    def add_catch(
        self, check_id, trap_id, species, recorded_at: Optional[datetime] = None
    ) -> CatchModel:
        catch = CatchModel(check_id=check_id, trap_id=trap_id, species=species)
        if recorded_at is not None:
            catch.recorded_at = recorded_at
        self.db.add(catch)
        self.db.commit()
        self.db.refresh(catch)
        return catch

    def catches_with_line_names(self) -> list[tuple[str, datetime]]:
        """Every catch as (trap line name, recorded_at). Used by the reports."""
        stmt = (
            select(TrapLineModel.name, CatchModel.recorded_at)
            .join(TrapModel, TrapModel.trap_line_id == TrapLineModel.id)
            .join(CatchModel, CatchModel.trap_id == TrapModel.id)
        )
        return [(name, when) for name, when in self.db.execute(stmt)]
