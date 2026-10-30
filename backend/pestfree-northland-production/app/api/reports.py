from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_coordinator
from app.db.database import get_db
from app.db.repositories import CheckRepository
from app.schemas import ReportOut
from app.services.reports import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/catches", response_model=ReportOut)
def catch_report(
    group: Literal["line", "month"] = "line",
    db: Session = Depends(get_db),
    _=Depends(require_coordinator),
):
    return ReportService(CheckRepository(db)).run(group)
