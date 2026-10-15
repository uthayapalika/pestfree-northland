from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_coordinator
from app.db.database import get_db
from app.schemas import TrapIn, TrapLineIn, TrapLineOut, TrapOut
from app.services.trap_service import TrapService

router = APIRouter(prefix="/trap-lines", tags=["Trap lines and traps"])


@router.post("", response_model=TrapLineOut, status_code=201)
def create_trap_line(
    data: TrapLineIn, db: Session = Depends(get_db), user=Depends(require_coordinator)
):
    return TrapService(db).create_line(user, data)


@router.get("", response_model=list[TrapLineOut])
def list_trap_lines(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return TrapService(db).lines.list_all()


@router.post("/{line_id}/traps", response_model=TrapOut, status_code=201)
def add_trap(
    line_id: int,
    data: TrapIn,
    db: Session = Depends(get_db),
    user=Depends(require_coordinator),
):
    return TrapService(db).create_trap(user, line_id, data)


@router.get("/{line_id}/traps", response_model=list[TrapOut])
def list_traps(
    line_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    return TrapService(db).list_traps(user, line_id)
