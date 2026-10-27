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


class TrapIn(BaseModel):
    code: Optional[str] = Field(default=None, min_length=1, max_length=30)
    trap_type: TrapType
    general_area: Optional[str] = Field(default=None, min_length=2, max_length=120)
    exact_lat: Optional[float] = Field(default=None, ge=-90, le=90)
    exact_lng: Optional[float] = Field(default=None, ge=-180, le=180)
    is_sensitive: bool = False
    status: Optional[TrapStatus] = None


class TrapOut(BaseModel):
    id: int
    trap_line_id: int
    code: str
    trap_type: TrapType
    recommended_bait: str
    general_area: str
    is_sensitive: bool
    status: TrapStatus = "active"
    exact_lat: Optional[float]
    exact_lng: Optional[float]
    last_status: Optional[CheckStatus] = None
    last_checked_at: Optional[datetime] = None


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