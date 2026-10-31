import os

os.environ["DATABASE_URL"] = (
    "sqlite:///./test_pestfree.db"  # must be set before importing the app
)

import pytest
from fastapi.testclient import TestClient

from app.db.database import Base, engine
from app.main import app


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


def make_user(client, name, email, role="volunteer"):
    client.post(
        "/auth/register",
        json={"name": name, "email": email, "password": "Passw0rd123", "role": role},
    )
    token = client.post(
        "/auth/login", json={"email": email, "password": "Passw0rd123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def coord(client):
    return make_user(client, "Coord One", "coord@example.com", "coordinator")


@pytest.fixture()
def vol(client):
    return make_user(client, "Vol One", "vol@example.com", "volunteer")
