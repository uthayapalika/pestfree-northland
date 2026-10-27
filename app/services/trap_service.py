from datetime import timezone

from app.db import models
from sqlalchemy.orm import Session

from app.db.models import UserModel
from app.db.repositories import (
    CheckRepository,
    TrapLineRepository,
    TrapMaintenanceRepository,
    TrapRepository,
)
from app.domain.traps import Trap
from app.errors import ServiceError
from app.schemas import CatchIn, CheckIn, TrapIn, TrapLineIn, TrapMaintenanceIn


def can_view_exact(user: UserModel) -> bool:
    return user.role == "coordinator" or user.can_view_exact_location


class TrapService:
    def __init__(self, db: Session):
        self.db = db
        self.lines = TrapLineRepository(db)
        self.traps = TrapRepository(db)
        self.checks = CheckRepository(db)
        self.maintenance = TrapMaintenanceRepository(db)

    def create_line(self, user: UserModel, data: TrapLineIn):
        return self.lines.add(data.name, data.general_area, user.id)

    def _view(self, trap: Trap, user: UserModel, general_area: str) -> dict:
        last = self.checks.last_for_trap(trap.id)
        return {
            "id": trap.id,
            "trap_line_id": trap.trap_line_id,
            "code": trap.code,
            "trap_type": trap.trap_type,
            "recommended_bait": trap.recommended_bait(),
            "general_area": general_area,
            "is_sensitive": trap.is_sensitive,
            "status": trap.status,
            **trap.visible_location(can_view_exact(user)),
            "last_status": last.status if last else None,
            "last_checked_at": last.checked_at if last else None,
        }

    def create_trap(self, user: UserModel, line_id: int, data: TrapIn) -> dict:
        line = self.lines.get(line_id)
        if not line:
            raise ServiceError("Trap line not found.", 404)
        if data.code is not None and self.traps.code_exists(line_id, data.code):
            raise ServiceError("This trap code already exists on that trap line.", 409)
        if data.is_sensitive and (data.exact_lat is None or data.exact_lng is None):
            raise ServiceError("Sensitive traps need exact_lat and exact_lng.", 400)
        trap = self.traps.add(
            line_id,
            data.code,
            data.trap_type,
            line.general_area,
            data.exact_lat,
            data.exact_lng,
            data.is_sensitive,
            data.status or "active",
        )
        return self._view(trap, user, line.general_area)

    def list_traps(self, user: UserModel, line_id: int) -> list[dict]:
        line = self.lines.get(line_id)
        if not line:
            raise ServiceError("Trap line not found.", 404)
        return [self._view(t, user, line.general_area) for t in self.traps.list_by_line(line_id)]

    def log_check(self, user: UserModel, trap_id: int, data: CheckIn):
        if not self.traps.get(trap_id):
            raise ServiceError("Trap not found.", 404)
        when = data.checked_at
        if when is not None and when.tzinfo is not None:
            when = when.astimezone(timezone.utc).replace(tzinfo=None)
        return self.checks.add_check(trap_id, user.id, data.status, data.notes, when)

    def list_checks(self, trap_id: int):
        if not self.traps.get(trap_id):
            raise ServiceError("Trap not found.", 404)
        return self.checks.list_for_trap(trap_id)

    def list_history(self, trap_id: int):
        if not self.traps.get(trap_id):
            raise ServiceError("Trap not found.", 404)
        return self.checks.history_for_trap(trap_id)

    def add_maintenance(
        self, user: UserModel, trap_id: int, data: TrapMaintenanceIn
    ):
        if not self.traps.get(trap_id):
            raise ServiceError("Trap not found.", 404)
        performed_at = data.performed_at
        if performed_at is not None and performed_at.tzinfo is not None:
            performed_at = performed_at.astimezone(timezone.utc).replace(tzinfo=None)
        return self.maintenance.add(trap_id, user.id, data.notes, performed_at)

    def list_maintenance(self, trap_id: int):
        if not self.traps.get(trap_id):
            raise ServiceError("Trap not found.", 404)
        return self.maintenance.list_for_trap(trap_id)

    def record_catch(self, check_id: int, data: CatchIn):
        check = self.checks.get_check(check_id)
        if not check:
            raise ServiceError("Trap check not found.", 404)
        if check.status != "caught":
            raise ServiceError(
                "Catches can only be recorded on a check with status 'caught'.", 400
            )
        return self.checks.add_catch(
            check.id, check.trap_id, data.species, check.checked_at
        )

    def delete_line(self, user, line_id: int):
        if user.role != "coordinator":
            raise ServiceError("Only coordinators can delete trap lines.", 403)

        line = next((l for l in self.lines.list_all() if l.id == line_id), None)
        if not line:
            raise ServiceError("Trap line not found.", 404)

        # Refuse if anything (e.g. traps) is still attached to this line.
        from sqlalchemy import inspect
        for rel in inspect(line).mapper.relationships:
            if rel.uselist and getattr(line, rel.key):
                raise ServiceError("This trap line still has traps. Delete or move them first.", 409)

        self.db.delete(line)
        self.db.commit()

    def update_line(self, user, line_id: int, data):
        if user.role != "coordinator":
            raise ServiceError("Only coordinators can edit trap lines.", 403)

        line = next((l for l in self.lines.list_all() if l.id == line_id), None)
        if not line:
            raise ServiceError("Trap line not found.", 404)

        line.name = data.name
        line.general_area = data.general_area
        self.db.commit()
        self.db.refresh(line)
        return line
