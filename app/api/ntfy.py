"""ntfy.sh push notifications (see app/main.py: app.include_router(ntfy.router))."""
import json
import os
import urllib.request

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user, require_coordinator
from app.errors import ServiceError

# Settings come from environment variables, with the topic as a fallback for local testing.
NTFY_SERVER = os.getenv("NTFY_SERVER", "https://ntfy.sh")
NTFY_TOPIC = os.getenv("NTFY_TOPIC", "pestfree-CQc7AQmWmpGuv20C")  # no slash at the start
NTFY_TOKEN = os.getenv("NTFY_TOKEN", "")  # optional, only for protected topics


def send_ntfy(title: str, message: str, priority: int = 3, tags: list[str] | None = None) -> None:
    """Send one notification. Raises an error if it fails."""
    if not NTFY_TOPIC:
        raise RuntimeError("NTFY_TOPIC is not set")

    body = json.dumps({
        "topic": NTFY_TOPIC, "title": title, "message": message,
        "priority": priority, "tags": tags or [],
    }).encode("utf-8")

    headers = {"Content-Type": "application/json"}
    if NTFY_TOKEN:
        headers["Authorization"] = "Bearer " + NTFY_TOKEN

    request = urllib.request.Request(NTFY_SERVER, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=10):
        pass


def notify(title: str, message: str, **kwargs) -> bool:
    """Safe version for routes: never crashes the request if ntfy is down."""
    try:
        send_ntfy(title, message, **kwargs)
        return True
    except Exception as err:
        print("ntfy failed:", err)
        return False


router = APIRouter(prefix="/notifications", tags=["Notifications"])


class TestIn(BaseModel):
    title: str = "Test alert"
    message: str = "Notifications are working."


@router.get("/info")
def info(_=Depends(get_current_user)):
    """Which topic to subscribe to. Any logged-in user can see it."""
    if not NTFY_TOPIC:
        raise ServiceError("NTFY_TOPIC is not set on the server.", 500)
    return {"server": NTFY_SERVER, "topic": NTFY_TOPIC, "url": f"{NTFY_SERVER}/{NTFY_TOPIC}"}


@router.post("/test")
def test(data: TestIn, _=Depends(require_coordinator)):
    """Send a test alert (coordinators only)."""
    try:
        send_ntfy(data.title, data.message, tags=["white_check_mark"])
    except Exception as err:
        raise ServiceError(f"Could not reach ntfy: {err}", 502)
    return {"ok": True}
