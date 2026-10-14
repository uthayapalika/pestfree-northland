from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from sqlalchemy.orm import Session

from app.config import ALGORITHM, SECRET_KEY, TOKEN_EXPIRE_MINUTES
from app.db.repositories import UserRepository
from app.errors import ServiceError
from app.schemas import RegisterIn


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user_id: int, role: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "role": role, "exp": expires},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise ServiceError("Invalid or expired token. Please log in again.", 401)


class AuthService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)

    def register(self, data: RegisterIn):
        email = data.email.lower()
        if self.users.get_by_email(email):
            raise ServiceError("That email is already registered.", 409)
        return self.users.add(data.name, email, hash_password(data.password), data.role)

    def login(self, email: str, password: str) -> dict:
        user = self.users.get_by_email(email.lower())
        if not user or not verify_password(password, user.password_hash):
            raise ServiceError("Incorrect email or password.", 401)
        return {
            "access_token": create_token(user.id, user.role),
            "token_type": "bearer",
            "role": user.role,
        }
