from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_coordinator
from app.db.database import get_db
from app.schemas import AuditLogOut
from app.services.audit import list_audit_logs

router = APIRouter(prefix="/audit", tags=["Audit history"])


@router.get("", response_model=list[AuditLogOut])
def audit_history(
    entity_type: Literal["trap", "user", "catch", "trap_line"] | None = None,
    entity_id: int | None = Query(default=None, ge=1),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    _=Depends(require_coordinator),
):
    return list_audit_logs(db, limit, entity_type, entity_id)
