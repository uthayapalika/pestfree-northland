from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import auth, checks, reports, trap_lines, traps, users
from app.config import BASE_DIR
from app.db import models  # noqa: F401  (registers the tables)
from app.db.database import Base, engine
from app.errors import ServiceError


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Pest-Free Northland Tracker API", version="1.0", lifespan=lifespan)

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


for module in (auth, users, trap_lines, traps, checks, reports):
    app.include_router(module.router)

# Optional: serve the HTML frontend from the same server (put it in the frontend/ folder).
frontend_dir = BASE_DIR / "frontend"
if frontend_dir.exists() and any(frontend_dir.iterdir()):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
