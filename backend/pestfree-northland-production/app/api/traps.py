from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_user,
    require_coordinator,
    require_non_field_worker,
)
from app.db.database import get_db
from app.schemas import (
    CheckIn,
    CheckOut,
    TrapHistoryOut,
    TrapMaintenanceIn,
    TrapMaintenanceOut,
)
from app.services.trap_service import TrapService

router = APIRouter(prefix="/traps", tags=["Trap checks"])


@router.post("/{trap_id}/checks", response_model=CheckOut, status_code=201)
def log_check(
    trap_id: int,
    data: CheckIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return TrapService(db).log_check(user, trap_id, data)


@router.get("/{trap_id}/checks", response_model=list[CheckOut])
def list_checks(
    trap_id: int, db: Session = Depends(get_db), _=Depends(require_non_field_worker)
):
    return TrapService(db).list_checks(trap_id)


@router.get("/{trap_id}/history", response_model=list[TrapHistoryOut])
def trap_history(
    trap_id: int, db: Session = Depends(get_db), _=Depends(require_non_field_worker)
):
    return TrapService(db).list_history(trap_id)


@router.get(
    "/{trap_id}/maintenance", response_model=list[TrapMaintenanceOut]
)
def list_trap_maintenance(
    trap_id: int, db: Session = Depends(get_db), _=Depends(require_non_field_worker)
):
    return TrapService(db).list_maintenance(trap_id)


@router.post(
    "/{trap_id}/maintenance",
    response_model=TrapMaintenanceOut,
    status_code=201,
)
def add_trap_maintenance(
    trap_id: int,
    data: TrapMaintenanceIn,
    db: Session = Depends(get_db),
    user=Depends(require_coordinator),
):
    record = TrapService(db).add_maintenance(user, trap_id, data)
    return {
        "performed_at": record.performed_at,
        "notes": record.notes,
        "recorded_by": user.name,
    }
