"""ntfy.sh push notifications (see app/main.py: app.include_router(ntfy.router))."""
import json
import os
from urllib.error import HTTPError, URLError
import urllib.request

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user, require_coordinator
from app.errors import ServiceError

# Use a local-only fallback; hosted deployments must supply their own topic.
NTFY_SERVER = os.getenv("NTFY_SERVER", "https://ntfy.sh")
_default_topic = "pestfree-CQc7AQmWmpGuv20C"
NTFY_TOPIC = os.getenv("NTFY_TOPIC", "")
if not NTFY_TOPIC and not os.getenv("RENDER"):
    NTFY_TOPIC = _default_topic
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
    if not NTFY_TOPIC:
        raise ServiceError(
            "NTFY_TOPIC is not set on the server. Configure it in Render's Environment settings.",
            503,
        )
    try:
        send_ntfy(data.title, data.message, tags=["white_check_mark"])
    except HTTPError as err:
        if err.code == 429:
            retry_after = err.headers.get("Retry-After") if err.headers else None
            wait_message = (
                f" Try again in {retry_after} seconds."
                if retry_after and retry_after.isdigit()
                else " Wait a little while before trying again."
            )
            raise ServiceError(
                "The ntfy service is temporarily rate-limiting notifications."
                + wait_message
                + " This limit is imposed by the notification service.",
                429,
            ) from err
        raise ServiceError(
            f"The ntfy service returned HTTP {err.code}. Please try again later.",
            502,
        ) from err
    except (URLError, TimeoutError) as err:
        raise ServiceError(
            "Could not connect to the ntfy service. Please try again later.",
            502,
        ) from err
    except Exception as err:
        raise ServiceError("The test notification could not be sent.", 502) from err
    return {"ok": True}
