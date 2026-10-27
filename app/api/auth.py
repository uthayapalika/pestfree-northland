from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.config import IS_RENDER, PUBLIC_REGISTRATION_ENABLED
from app.db.database import get_db
from app.errors import ServiceError
from app.schemas import LoginIn, PublicRegisterIn, TokenOut, UserOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: PublicRegisterIn, db: Session = Depends(get_db)):
    if not PUBLIC_REGISTRATION_ENABLED:
        raise ServiceError(
            "Public registration is disabled. Ask a coordinator to create your account.",
            403,
        )
    if IS_RENDER and data.role != "volunteer":
        raise ServiceError(
            "Public registration can only create volunteer accounts.", 403
        )
    return AuthService(db).register(data)


@router.get("/registration-status")
def registration_status():
    return {"enabled": PUBLIC_REGISTRATION_ENABLED}


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    """JSON login: use this one from the frontend."""
    return AuthService(db).login(data.email, data.password)


@router.post("/token", response_model=TokenOut, include_in_schema=True)
def token(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Form login: used by the green Authorize button in /docs."""
    return AuthService(db).login(form.username, form.password)


@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return user
