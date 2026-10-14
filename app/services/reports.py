from abc import ABC, abstractmethod
from collections import Counter
from datetime import datetime

from app.db.repositories import CheckRepository
from app.errors import ServiceError

Catches = list[tuple[str, datetime]]  # (trap line name, recorded_at)


class ReportStrategy(ABC):
    """Strategy pattern: each subclass is an interchangeable report type."""

    @abstractmethod
    def build(self, catches: Catches) -> list[tuple[str, int]]: ...


class ByTrapLineReport(ReportStrategy):
    def build(self, catches: Catches):
        counts = Counter(name for name, _ in catches)
        return sorted(counts.items())


class ByMonthReport(ReportStrategy):
    def build(self, catches: Catches):
        counts = Counter(when.strftime("%Y-%m") for _, when in catches)
        return sorted(counts.items())


class ReportService:
    strategies = {"line": ByTrapLineReport(), "month": ByMonthReport()}

    def __init__(self, checks: CheckRepository):
        self.checks = checks

    def run(self, group: str) -> dict:
        strategy = self.strategies.get(group)
        if strategy is None:
            raise ServiceError("Report group must be 'line' or 'month'.", 400)
        catches = self.checks.catches_with_line_names()
        rows = [{"label": label, "catches": n} for label, n in strategy.build(catches)]
        return {"group": group, "total": len(catches), "rows": rows}
