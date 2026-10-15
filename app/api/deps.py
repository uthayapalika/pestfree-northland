from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import UserModel
from app.db.repositories import UserRepository
from app.errors import ServiceError
from app.services.auth_service import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> UserModel:
    user = UserRepository(db).get_by_id(decode_token(token))
    if not user:
        raise ServiceError("User no longer exists.", 401)
    return user


def require_coordinator(user: UserModel = Depends(get_current_user)) -> UserModel:
    if user.role != "coordinator":
        raise ServiceError("Coordinator access required.", 403)
    return user
