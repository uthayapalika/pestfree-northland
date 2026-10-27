from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_coordinator
from app.db.database import get_db
from app.db.models import TrapLineModel, TrapModel
from app.errors import ServiceError
from app.schemas import TrapImportIn, TrapImportResult
from app.services.audit import record_audit, trap_snapshot

router = APIRouter(prefix="/imports", tags=["Data import"])


@router.post("/traps", response_model=TrapImportResult)
def import_traps(
    data: TrapImportIn,
    db: Session = Depends(get_db),
    actor=Depends(require_coordinator),
):
    lines = list(db.scalars(select(TrapLineModel)))
    line_by_name = {line.name.strip().casefold(): line for line in lines}
    existing = {
        (trap.trap_line_id, trap.code): trap
        for trap in db.scalars(select(TrapModel))
    }
    reserved = {(line_id, code.casefold()) for line_id, code in existing}
    seen: set[tuple[int, str]] = set()
    prepared = []
    errors = []

    for row_number, row in enumerate(data.rows, start=2):
        line = line_by_name.get(row.trap_line.strip().casefold())
        if not line:
            errors.append(f"Row {row_number}: unknown trap line '{row.trap_line}'.")
            continue
        code = row.code.strip() if row.code else None
        if code:
            key = (line.id, code.casefold())
            if key in seen:
                errors.append(
                    f"Row {row_number}: duplicate trap code '{code}' in this CSV."
                )
                continue
            seen.add(key)
            trap = existing.get((line.id, code))
            if trap is None:
                trap = next(
                    (
                        item
                        for (line_id, existing_code), item in existing.items()
                        if line_id == line.id
                        and existing_code.casefold() == code.casefold()
                    ),
                    None,
                )
            if trap and not data.update_existing:
                errors.append(
                    f"Row {row_number}: trap code '{code}' already exists on "
                    f"'{line.name}'. Enable update existing to change it."
                )
                continue
        else:
            trap = None

        if row.is_sensitive and (row.exact_lat is None or row.exact_lng is None):
            errors.append(
                f"Row {row_number}: sensitive traps require both coordinates."
            )
            continue
        prepared.append((row_number, row, line, code, trap))

    if errors:
        return {"created": 0, "updated": 0, "errors": errors}

    created = updated = 0
    try:
        for row_number, row, line, code, trap in prepared:
            if trap:
                before = trap_snapshot(trap)
                trap.trap_type = row.trap_type
                trap.general_area = row.general_area or line.general_area
                trap.exact_lat = row.exact_lat
                trap.exact_lng = row.exact_lng
                trap.is_sensitive = row.is_sensitive
                trap.status = row.status
                after = trap_snapshot(trap)
                record_audit(
                    db, actor, "updated", "trap", trap.id, before, after
                )
                updated += 1
                continue

            new_trap = TrapModel(
                trap_line_id=line.id,
                code=code or "",
                trap_type=row.trap_type,
                general_area=row.general_area or line.general_area,
                exact_lat=row.exact_lat,
                exact_lng=row.exact_lng,
                is_sensitive=row.is_sensitive,
                status=row.status,
            )
            db.add(new_trap)
            db.flush()
            if not code:
                base_code = f"TRAP-{new_trap.id:04d}"
                generated = base_code
                suffix = 2
                while (line.id, generated.casefold()) in reserved:
                    generated = f"{base_code}-{suffix}"
                    suffix += 1
                new_trap.code = generated
            existing[(line.id, new_trap.code)] = new_trap
            reserved.add((line.id, new_trap.code.casefold()))
            record_audit(
                db,
                actor,
                "created",
                "trap",
                new_trap.id,
                None,
                trap_snapshot(new_trap),
            )
            created += 1
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {"created": created, "updated": updated, "errors": []}
