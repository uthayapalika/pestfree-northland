from datetime import timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_coordinator
from app.db.database import get_db
from app.db.models import CatchModel, TrapCheckModel, TrapModel
from app.errors import ServiceError
from app.schemas import CatchCreateIn, CatchIn, CatchOut
from app.services.trap_service import TrapService

router = APIRouter(prefix="/checks", tags=["Catches"])
catches_router = APIRouter(prefix="/catches", tags=["Catches"])


@router.post("/{check_id}/catches", response_model=CatchOut, status_code=201)
def record_catch(
    check_id: int,
    data: CatchIn,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return TrapService(db).record_catch(check_id, data)


@catches_router.get("", response_model=list[CatchOut])
def list_catches(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return list(db.scalars(select(CatchModel).order_by(CatchModel.recorded_at.desc(), CatchModel.id.desc())))


@catches_router.post("", response_model=CatchOut, status_code=201)
def create_catch(
    data: CatchCreateIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    trap = db.get(TrapModel, data.trap_id)
    if not trap:
        raise ServiceError("Trap not found.", 404)

    checked_at = data.checked_at
    if checked_at is not None and checked_at.tzinfo is not None:
        checked_at = checked_at.astimezone(timezone.utc).replace(tzinfo=None)

    check = TrapCheckModel(
        trap_id=trap.id,
        user_id=user.id,
        status="caught",
        notes=data.notes,
    )
    if checked_at is not None:
        check.checked_at = checked_at
    db.add(check)
    db.flush()
    catch = CatchModel(
        check_id=check.id,
        trap_id=trap.id,
        species=data.species,
        recorded_at=check.checked_at,
    )
    db.add(catch)
    db.commit()
    db.refresh(catch)
    return catch


@catches_router.put("/{catch_id}", response_model=CatchOut)
def update_catch(
    catch_id: int,
    data: CatchIn,
    db: Session = Depends(get_db),
    _=Depends(require_coordinator),
):
    catch = db.get(CatchModel, catch_id)
    if not catch:
        raise ServiceError("Catch not found.", 404)
    catch.species = data.species
    db.commit()
    db.refresh(catch)
    return catch


@catches_router.delete("/{catch_id}", status_code=204)
def delete_catch(
    catch_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_coordinator),
):
    catch = db.get(CatchModel, catch_id)
    if not catch:
        raise ServiceError("Catch not found.", 404)
    db.delete(catch)
    db.commit()
