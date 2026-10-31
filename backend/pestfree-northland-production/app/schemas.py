from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["volunteer", "field_worker", "coordinator"]
PublicRole = Literal["volunteer", "coordinator"]
CheckStatus = Literal["empty", "caught", "bait_needed", "sprung"]
TrapStatus = Literal[
    "active", "needs_bait", "damaged", "missing", "under_maintenance"
]
Species = Literal["possum", "rat", "stoat", "mouse", "hedgehog", "other"]
TrapType = Species


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)
    password: str = Field(min_length=8, max_length=64)
    role: Role = "volunteer"


class PublicRegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)
    password: str = Field(min_length=8, max_length=64)
    role: PublicRole = "volunteer"


class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: Role
    can_view_exact_location: bool
    has_notification_topic: bool = False


class LocationAccessIn(BaseModel):
    can_view_exact_location: bool


class TrapLineIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    general_area: str = Field(min_length=2, max_length=120)


class TrapLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    general_area: str
    created_at: datetime


class TrapLineAssignmentIn(BaseModel):
    user_id: int


class TrapLineAssignmentOut(BaseModel):
    id: int
    trap_line_id: int
    user_id: int
    user_name: str
    assigned_by: int
    assigned_at: datetime


class FieldTaskIn(BaseModel):
    trap_id: Optional[int] = None
    trap_line_id: Optional[int] = None
    assigned_to: int
    title: str = Field(min_length=2, max_length=120)
    notes: str = Field(default="", max_length=500)
    due_at: Optional[datetime] = None


class FieldTaskStatusIn(BaseModel):
    status: Literal["open", "completed"]


class FieldTaskOut(BaseModel):
    id: int
    trap_id: Optional[int]
    trap_line_id: Optional[int]
    trap_code: Optional[str]
    trap_line: Optional[str]
    assigned_to: int
    assigned_name: str
    assigned_by: int
    title: str
    notes: str
    due_at: Optional[datetime]
    status: Literal["open", "completed"]
    created_at: datetime
    completed_at: Optional[datetime]


class NeighborAssistRequestIn(BaseModel):
    request_type: Literal["visit", "delivery", "visit_and_delivery"]
    general_area: str = Field(min_length=2, max_length=120)
    details: str = Field(min_length=10, max_length=1000)
    contact_phone: str = Field(default="", max_length=32)
    preferred_time: Optional[str] = Field(default=None, max_length=120)


class NeighborAssistAssignmentIn(BaseModel):
    assigned_to: int
    inventory_item_id: Optional[int] = None
    supply_quantity: Optional[int] = Field(default=None, ge=1, le=10000)
    due_at: Optional[datetime] = None


class NeighborAssistStatusIn(BaseModel):
    status: Literal["in_progress", "completed", "cancelled"]


class NeighborAssistRequestOut(BaseModel):
    id: int
    request_type: Literal["visit", "delivery", "visit_and_delivery"]
    created_by: int
    created_name: str
    assigned_to: Optional[int]
    assigned_name: Optional[str]
    assigned_by: Optional[int]
    general_area: str
    details: str
    contact_phone: str
    preferred_time: Optional[str]
    inventory_item_id: Optional[int]
    inventory_item_name: Optional[str]
    supply_quantity: Optional[int]
    status: Literal["submitted", "assigned", "in_progress", "completed", "cancelled"]
    due_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]


class NeighborAssistSummaryOut(BaseModel):
    requests_total: int
    requests_active: int
    neighbors_helped: int
    volunteers_active: int


class NotificationTopicIn(BaseModel):
    topic: Optional[str] = Field(
        default=None,
        min_length=16,
        max_length=100,
        pattern=r"^[A-Za-z0-9_-]{16,100}$",
    )


class AuditLogOut(BaseModel):
    id: int
    actor_id: Optional[int]
    actor_name: str
    action: str
    entity_type: str
    entity_id: int
    changed_at: datetime
    before: Optional[dict]
    after: Optional[dict]


class TrapImportRow(BaseModel):
    trap_line: str = Field(min_length=2, max_length=80)
    code: Optional[str] = Field(default=None, max_length=30)
    trap_type: TrapType
    general_area: Optional[str] = Field(default=None, max_length=120)
    exact_lat: Optional[float] = Field(default=None, ge=-90, le=90)
    exact_lng: Optional[float] = Field(default=None, ge=-180, le=180)
    is_sensitive: bool = False
    status: TrapStatus = "active"
    inspection_interval_days: int = Field(default=14, ge=1, le=365)


class TrapImportIn(BaseModel):
    rows: list[TrapImportRow] = Field(min_length=1, max_length=500)
    update_existing: bool = False


class TrapImportResult(BaseModel):
    created: int
    updated: int
    errors: list[str]


class TrapIn(BaseModel):
    code: Optional[str] = Field(default=None, min_length=1, max_length=30)
    trap_type: TrapType
    general_area: Optional[str] = Field(default=None, min_length=2, max_length=120)
    exact_lat: Optional[float] = Field(default=None, ge=-90, le=90)
    exact_lng: Optional[float] = Field(default=None, ge=-180, le=180)
    is_sensitive: bool = False
    status: Optional[TrapStatus] = None
    inspection_interval_days: int = Field(default=14, ge=1, le=365)


class TrapOut(BaseModel):
    id: int
    trap_line_id: int
    code: str
    trap_type: TrapType
    recommended_bait: str
    general_area: str
    is_sensitive: bool
    status: TrapStatus = "active"
    inspection_interval_days: int
    exact_lat: Optional[float]
    exact_lng: Optional[float]
    last_status: Optional[CheckStatus] = None
    last_checked_at: Optional[datetime] = None


class InventoryItemIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    category: Literal["bait", "equipment", "maintenance", "other"] = "other"
    unit: str = Field(min_length=1, max_length=20)
    quantity: int = Field(default=0, ge=0, le=1000000)
    reorder_level: int = Field(default=0, ge=0, le=1000000)


class InventoryMovementIn(BaseModel):
    quantity_change: int = Field(ge=-1000000, le=1000000)
    reason: str = Field(min_length=2, max_length=200)


class InventoryItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    category: str
    unit: str
    quantity: int
    reorder_level: int
    needs_reorder: bool
    created_at: datetime


class CheckIn(BaseModel):
    status: CheckStatus
    notes: str = Field(default="", max_length=500)
    checked_at: Optional[datetime] = None


class CheckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    trap_id: int
    user_id: int
    checked_at: datetime
    status: CheckStatus
    notes: str


class TrapHistoryOut(BaseModel):
    checked_at: datetime
    status: CheckStatus
    notes: str
    recorded_by: str
    species: list[Species]


class TrapMaintenanceIn(BaseModel):
    notes: str = Field(min_length=2, max_length=500)
    performed_at: Optional[datetime] = None


class TrapMaintenanceOut(BaseModel):
    performed_at: datetime
    notes: str
    recorded_by: str


class CatchIn(BaseModel):
    species: Species


class CatchCreateIn(BaseModel):
    trap_id: int
    species: Species
    notes: str = Field(default="", max_length=500)
    checked_at: Optional[datetime] = None


class CatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    check_id: int
    trap_id: int
    species: Species
    recorded_at: datetime


class CatchListOut(CatchOut):
    trap_code: str
    trap_line_id: int
    trap_line: str
    recorded_by: str


class ReportRow(BaseModel):
    label: str
    catches: int


class ReportOut(BaseModel):
    group: str
    total: int
    rows: list[ReportRow]
