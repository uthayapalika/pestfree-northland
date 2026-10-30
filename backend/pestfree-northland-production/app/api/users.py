from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_coordinator
from app.db.database import get_db
from app.db.repositories import UserRepository
from app.errors import ServiceError
from app.schemas import LocationAccessIn, NotificationTopicIn, RegisterIn, UserOut
from app.services.audit import record_audit, user_snapshot
from app.services.auth_service import AuthService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_coordinator)):
    return UserRepository(db).list_all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    data: RegisterIn,
    db: Session = Depends(get_db),
    actor=Depends(require_coordinator),
):
    user = AuthService(db).register(data)
    record_audit(db, actor, "created", "user", user.id, None, user_snapshot(user))
    db.commit()
    return user


@router.put("/me/notification-topic", response_model=UserOut)
def set_my_notification_topic(
    data: NotificationTopicIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    previous_topic = user.notification_topic
    before = {"has_notification_topic": bool(user.notification_topic)}
    user.notification_topic = data.topic
    if previous_topic != user.notification_topic:
        record_audit(
            db,
            user,
            "updated",
            "user",
            user.id,
            before,
            {"has_notification_topic": bool(user.notification_topic)},
        )
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/location-access", response_model=UserOut)
def set_location_access(
    user_id: int,
    data: LocationAccessIn,
    db: Session = Depends(get_db),
    actor=Depends(require_coordinator),
):
    repo = UserRepository(db)
    user = repo.get_by_id(user_id)
    if not user:
        raise ServiceError("User not found.", 404)
    before = user_snapshot(user)
    user.can_view_exact_location = data.can_view_exact_location
    record_audit(
        db, actor, "updated", "user", user_id, before, user_snapshot(user)
    )
    saved = repo.save(user)
    return saved
