from datetime import timezone

from sqlalchemy.orm import Session

from app.db.models import UserModel
from app.db.repositories import CheckRepository, TrapLineRepository, TrapRepository
from app.domain.traps import Trap
from app.errors import ServiceError
from app.schemas import CatchIn, CheckIn, TrapIn, TrapLineIn


def can_view_exact(user: UserModel) -> bool:
    return user.role == "coordinator" or user.can_view_exact_location


class TrapService:
    def __init__(self, db: Session):
        self.lines = TrapLineRepository(db)
        self.traps = TrapRepository(db)
        self.checks = CheckRepository(db)

    def create_line(self, user: UserModel, data: TrapLineIn):
        return self.lines.add(data.name, data.general_area, user.id)

    def _view(self, trap: Trap, user: UserModel) -> dict:
        last = self.checks.last_for_trap(trap.id)
        return {
            "id": trap.id,
            "trap_line_id": trap.trap_line_id,
            "code": trap.code,
            "trap_type": trap.trap_type,
            "recommended_bait": trap.recommended_bait(),
            "general_area": trap.general_area,
            "is_sensitive": trap.is_sensitive,
            **trap.visible_location(can_view_exact(user)),
            "last_status": last.status if last else None,
            "last_checked_at": last.checked_at if last else None,
        }

    def create_trap(self, user: UserModel, line_id: int, data: TrapIn) -> dict:
        if not self.lines.get(line_id):
            raise ServiceError("Trap line not found.", 404)
        if self.traps.code_exists(line_id, data.code):
            raise ServiceError("This trap code already exists on that trap line.", 409)
        if data.is_sensitive and (data.exact_lat is None or data.exact_lng is None):
            raise ServiceError("Sensitive traps need exact_lat and exact_lng.", 400)
        trap = self.traps.add(
            line_id,
            data.code,
            data.trap_type,
            data.general_area,
            data.exact_lat,
            data.exact_lng,
            data.is_sensitive,
        )
        return self._view(trap, user)

    def list_traps(self, user: UserModel, line_id: int) -> list[dict]:
        if not self.lines.get(line_id):
            raise ServiceError("Trap line not found.", 404)
        return [self._view(t, user) for t in self.traps.list_by_line(line_id)]

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
