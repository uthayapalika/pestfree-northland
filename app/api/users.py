from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_coordinator
from app.db.database import get_db
from app.db.repositories import UserRepository
from app.errors import ServiceError
from app.schemas import LocationAccessIn, UserOut

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_coordinator)):
    return UserRepository(db).list_all()


@router.patch("/{user_id}/location-access", response_model=UserOut)
def set_location_access(
    user_id: int,
    data: LocationAccessIn,
    db: Session = Depends(get_db),
    _=Depends(require_coordinator),
):
    repo = UserRepository(db)
    user = repo.get_by_id(user_id)
    if not user:
        raise ServiceError("User not found.", 404)
    user.can_view_exact_location = data.can_view_exact_location
    return repo.save(user)
