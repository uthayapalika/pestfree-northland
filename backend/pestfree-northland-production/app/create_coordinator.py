"""Create a coordinator account directly in the configured database."""

import argparse
from getpass import getpass

from app.db import models  # noqa: F401
from app.db.database import Base, SessionLocal, engine, upgrade_legacy_schema
from app.schemas import RegisterIn
from app.services.auth_service import AuthService


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a coordinator account.")
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    args = parser.parse_args()

    password = getpass("Coordinator password (8-64 characters): ")
    confirmation = getpass("Confirm password: ")
    if password != confirmation:
        raise SystemExit("Passwords do not match.")

    data = RegisterIn(
        name=args.name,
        email=args.email,
        password=password,
        role="coordinator",
    )
    Base.metadata.create_all(bind=engine)
    upgrade_legacy_schema()
    db = SessionLocal()
    try:
        user = AuthService(db).register(data)
    finally:
        db.close()
    print(f"Coordinator account created for {user.email}.")


if __name__ == "__main__":
    main()
