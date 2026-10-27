from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import (
    admin_edit,
    audit,
    auth,
    checks,
    imports,
    ntfy,
    reports,
    tasks,
    trap_lines,
    traps,
    users,
)
from app.config import BASE_DIR
from app.db import models  # noqa: F401  (registers the tables)
from app.db.database import Base, engine, upgrade_legacy_schema
from app.errors import ServiceError


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    upgrade_legacy_schema()
    yield


app = FastAPI(title="Pest-Free Tracker API", version="1.0", lifespan=lifespan)

# Lets a frontend on another address (your friend's) call this API.
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


@app.exception_handler(ServiceError)
async def service_error_handler(request: Request, exc: ServiceError):
    headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
    return JSONResponse(
        status_code=exc.status_code, content={"detail": exc.message}, headers=headers
    )


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


# ntfy = push notifications (alerts to the ntfy phone app)
for module in (
    auth,
    users,
    trap_lines,
    traps,
    checks,
    reports,
    admin_edit,
    ntfy,
    audit,
    tasks,
    imports,
):
    app.include_router(module.router)
app.include_router(checks.catches_router)

# Optional: serve the HTML frontend from the same server (put it in the frontend/ folder).
frontend_dir = BASE_DIR / "frontend"
if frontend_dir.exists() and any(frontend_dir.iterdir()):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")