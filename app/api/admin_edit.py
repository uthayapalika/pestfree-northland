"""Edit and delete routes for traps and users.

Put this file in app/api/ and register it in app/main.py (see the two lines in the chat).
It finds your database models by their column names, so it does not depend on class names.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_coordinator
from app.db.database import Base, get_db
from app.errors import ServiceError
from app.schemas import Role, TrapIn

router = APIRouter(tags=["Edit and delete"])

# Same bait the sample data uses for each trap type.
BAIT = {
    "possum": "Apple or peanut butter",
    "rat": "Peanut butter or chocolate",
    "stoat": "Fresh egg or rabbit meat",
}


def _model(*columns):
    """Find the database model that has all of these columns."""
    for mapper in Base.registry.mappers:
        if all(hasattr(mapper.class_, c) for c in columns):
            return mapper.class_
    raise ServiceError("Server setup problem: no model with " + ", ".join(columns), 500)


def _set(obj, names, value, required=True):
    """Set the first attribute from `names` that the model has."""
    for n in names:
        if hasattr(type(obj), n):
            try:
                setattr(obj, n, value)
                return
            except AttributeError:
                break
    if required:
        raise ServiceError("Server setup problem: no column named " + " / ".join(names), 500)


def _commit(db: Session, message: str):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ServiceError(message, 409)


# ---------------- Traps ----------------
@router.put("/traps/{trap_id}")
def update_trap(
    trap_id: int,
    data: TrapIn,
    db: Session = Depends(get_db),
    user=Depends(require_coordinator),
):
    trap = db.get(_model("code", "trap_line_id"), trap_id)
    if not trap:
        raise ServiceError("Trap not found.", 404)
    if data.is_sensitive and (data.exact_lat is None or data.exact_lng is None):
        raise ServiceError("Sensitive traps need exact_lat and exact_lng.", 400)
    Trap = _model("code", "trap_line_id")
    duplicate = db.query(Trap).filter(
        Trap.trap_line_id == trap.trap_line_id,
        Trap.code == data.code,
        Trap.id != trap_id,
    ).first()
    if duplicate:
        raise ServiceError("This trap code already exists on that trap line.", 409)
    _set(trap, ("code",), data.code)
    _set(trap, ("trap_type", "type"), data.trap_type)
    _set(trap, ("general_area",), data.general_area)
    _set(trap, ("exact_lat", "lat", "latitude"), data.exact_lat)
    _set(trap, ("exact_lng", "lng", "longitude"), data.exact_lng)
    _set(trap, ("is_sensitive",), data.is_sensitive)
    _set(trap, ("recommended_bait",), BAIT[data.trap_type], required=False)
    _commit(db, "Could not save: that trap code may already be used.")
    return {"id": trap_id, "updated": True}


@router.delete("/traps/{trap_id}", status_code=204)
def delete_trap(
    trap_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_coordinator),
):
    trap = db.get(_model("code", "trap_line_id"), trap_id)
    if not trap:
        raise ServiceError("Trap not found.", 404)
    # Remove this trap's check history first (catches belong to checks).
    Check = _model("checked_at", "notes", "trap_id")
    Catch = _model("species", "check_id")
    check_ids = [i for (i,) in db.query(Check.id).filter(Check.trap_id == trap_id)]
    if check_ids:
        db.query(Catch).filter(Catch.check_id.in_(check_ids)).delete(synchronize_session=False)
        db.query(Check).filter(Check.id.in_(check_ids)).delete(synchronize_session=False)
    db.delete(trap)
    _commit(db, "This trap is still in use and cannot be deleted.")


# ---------------- Users ----------------
class UserUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)
    role: Role
    can_view_exact_location: bool


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_coordinator),
):
    target = db.get(_model("email", "role"), user_id)
    if not target:
        raise ServiceError("User not found.", 404)
    if target.id == user.id and data.role != "coordinator":
        raise ServiceError("You cannot remove your own coordinator role.", 400)
    target.name = data.name
    target.email = data.email.strip()
    target.role = data.role
    target.can_view_exact_location = data.can_view_exact_location
    _commit(db, "That email is already used by another user.")
    return {"id": user_id, "updated": True}


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_coordinator),
):
    target = db.get(_model("email", "role"), user_id)
    if not target:
        raise ServiceError("User not found.", 404)
    if target.id == user.id:
        raise ServiceError("You cannot delete your own account.", 400)
    Check = _model("checked_at", "notes", "trap_id")
    if db.query(Check).filter(Check.user_id == user_id).first():
        raise ServiceError("This user has recorded trap checks, so they cannot be deleted.", 409)
    db.delete(target)
    _commit(db, "This user is still in use and cannot be deleted.")