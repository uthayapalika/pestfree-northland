from datetime import timezone

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_coordinator, require_non_field_worker
from app.api.ntfy import notify
from app.db.database import get_db
from app.db.models import (
    CatchModel,
    TrapCheckModel,
    TrapLineModel,
    TrapModel,
    UserModel,
)
from app.errors import ServiceError
from app.schemas import CatchCreateIn, CatchIn, CatchListOut, CatchOut
from app.services.trap_service import TrapService

router = APIRouter(prefix="/checks", tags=["Catches"])
catches_router = APIRouter(prefix="/catches", tags=["Catches"])


@router.post("/{check_id}/catches", response_model=CatchOut, status_code=201)
def record_catch(
    check_id: int,
    data: CatchIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    catch = TrapService(db).record_catch(check_id, data)
    species = getattr(data.species, "value", data.species)
    background_tasks.add_task(notify, "New catch", f"{species} caught", tags=["bug"])
    return catch


@catches_router.get("", response_model=list[CatchListOut])
def list_catches(
    db: Session = Depends(get_db), _=Depends(require_non_field_worker)
):
    rows = db.execute(
        select(
            CatchModel,
            TrapModel.code,
            TrapModel.trap_line_id,
            TrapLineModel.name,
            UserModel.name,
        )
        .join(TrapModel, CatchModel.trap_id == TrapModel.id)
        .join(TrapLineModel, TrapModel.trap_line_id == TrapLineModel.id)
        .join(TrapCheckModel, CatchModel.check_id == TrapCheckModel.id)
        .join(UserModel, TrapCheckModel.user_id == UserModel.id)
        .order_by(CatchModel.recorded_at.desc(), CatchModel.id.desc())
    )
    return [
        {
            "id": catch.id,
            "check_id": catch.check_id,
            "trap_id": catch.trap_id,
            "species": catch.species,
            "recorded_at": catch.recorded_at,
            "trap_code": trap_code,
            "trap_line_id": trap_line_id,
            "trap_line": trap_line,
            "recorded_by": recorded_by,
        }
        for catch, trap_code, trap_line_id, trap_line, recorded_by in rows
    ]


@catches_router.post("", response_model=CatchOut, status_code=201)
def create_catch(
    data: CatchCreateIn,
    background_tasks: BackgroundTasks,
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
    # Alert goes out AFTER the catch is saved (no location in the message).
    background_tasks.add_task(notify, "New catch", f"{catch.species} caught in trap {trap.code}", tags=["bug"])
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