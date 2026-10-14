from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.schemas import CatchIn, CatchOut
from app.services.trap_service import TrapService

router = APIRouter(prefix="/checks", tags=["Catches"])


@router.post("/{check_id}/catches", response_model=CatchOut, status_code=201)
def record_catch(
    check_id: int,
    data: CatchIn,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return TrapService(db).record_catch(check_id, data)
