from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.schemas import CheckIn, CheckOut
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
    trap_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    return TrapService(db).list_checks(trap_id)
