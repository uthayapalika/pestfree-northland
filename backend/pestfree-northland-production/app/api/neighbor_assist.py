from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy import distinct, func, or_, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_coordinator
from app.api.ntfy import NTFY_TOPIC, notify
from app.db.database import get_db
from app.db.models import (
    InventoryItemModel,
    InventoryMovementModel,
    NeighborAssistRequestModel,
    UserModel,
)
from app.errors import ServiceError
from app.schemas import (
    NeighborAssistAssignmentIn,
    NeighborAssistRequestIn,
    NeighborAssistRequestOut,
    NeighborAssistStatusIn,
    NeighborAssistSummaryOut,
)
from app.services.audit import record_audit

router = APIRouter(prefix="/neighbor-assist", tags=["Neighbor Assist"])


def _snapshot(request: NeighborAssistRequestModel) -> dict:
    # Keep contact details and free-text requests out of the audit trail.
    return {
        "request_type": request.request_type,
        "created_by": request.created_by,
        "assigned_to": request.assigned_to,
        "general_area": request.general_area,
        "inventory_item_id": request.inventory_item_id,
        "supply_quantity": request.supply_quantity,
        "status": request.status,
    }


def _view(db: Session, request: NeighborAssistRequestModel) -> dict:
    creator = db.get(UserModel, request.created_by)
    assignee = db.get(UserModel, request.assigned_to) if request.assigned_to else None
    item = (
        db.get(InventoryItemModel, request.inventory_item_id)
        if request.inventory_item_id
        else None
    )
    return {
        "id": request.id,
        "request_type": request.request_type,
        "created_by": request.created_by,
        "created_name": creator.name if creator else "Former user",
        "assigned_to": request.assigned_to,
        "assigned_name": assignee.name if assignee else None,
        "assigned_by": request.assigned_by,
        "general_area": request.general_area,
        "details": request.details,
        "contact_phone": request.contact_phone,
        "preferred_time": request.preferred_time,
        "inventory_item_id": request.inventory_item_id,
        "inventory_item_name": item.name if item else None,
        "supply_quantity": request.supply_quantity,
        "status": request.status,
        "due_at": request.due_at,
        "created_at": request.created_at,
        "updated_at": request.updated_at,
        "completed_at": request.completed_at,
    }


@router.get("/summary", response_model=NeighborAssistSummaryOut)
def community_summary(
    db: Session = Depends(get_db), _=Depends(get_current_user)
):
    """Return aggregate-only community impact counts; never expose request details."""
    model = NeighborAssistRequestModel
    total = db.scalar(select(func.count(model.id))) or 0
    active = db.scalar(
        select(func.count(model.id)).where(model.status.in_(["assigned", "in_progress"]))
    ) or 0
    helped = db.scalar(
        select(func.count(model.id)).where(model.status == "completed")
    ) or 0
    volunteers = db.scalar(
        select(func.count(distinct(model.assigned_to))).where(
            model.assigned_to.is_not(None), model.status.in_(["assigned", "in_progress"])
        )
    ) or 0
    return {
        "requests_total": total,
        "requests_active": active,
        "neighbors_helped": helped,
        "volunteers_active": volunteers,
    }


@router.get("/requests", response_model=list[NeighborAssistRequestOut])
def list_requests(db: Session = Depends(get_db), user=Depends(get_current_user)):
    statement = select(NeighborAssistRequestModel).order_by(
        NeighborAssistRequestModel.created_at.desc(),
        NeighborAssistRequestModel.id.desc(),
    )
    if user.role != "coordinator":
        statement = statement.where(
            or_(
                NeighborAssistRequestModel.created_by == user.id,
                NeighborAssistRequestModel.assigned_to == user.id,
            )
        )
    return [_view(db, request) for request in db.scalars(statement)]


@router.post(
    "/requests",
    response_model=NeighborAssistRequestOut,
    status_code=status.HTTP_201_CREATED,
)
def create_request(
    data: NeighborAssistRequestIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    actor=Depends(get_current_user),
):
    request = NeighborAssistRequestModel(
        request_type=data.request_type,
        created_by=actor.id,
        general_area=data.general_area.strip(),
        details=data.details.strip(),
        contact_phone=data.contact_phone.strip(),
        preferred_time=data.preferred_time.strip() if data.preferred_time else None,
    )
    db.add(request)
    db.flush()
    record_audit(db, actor, "created", "neighbor_assist", request.id, None, _snapshot(request))
    db.commit()
    db.refresh(request)
    background_tasks.add_task(
        notify,
        "Neighbor Assist request",
        f"A {request.request_type.replace('_', ' ')} request was submitted in {request.general_area}.",
        tags=["house"],
    )
    return _view(db, request)


@router.post(
    "/requests/{request_id}/assign",
    response_model=NeighborAssistRequestOut,
)
def assign_request(
    request_id: int,
    data: NeighborAssistAssignmentIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    actor=Depends(require_coordinator),
):
    request = db.get(NeighborAssistRequestModel, request_id)
    if not request:
        raise ServiceError("Neighbor Assist request not found.", 404)
    if request.status not in {"submitted", "assigned"}:
        raise ServiceError("Only new or assigned requests can be reassigned.", 409)
    assignee = db.get(UserModel, data.assigned_to)
    if not assignee or assignee.role not in {"volunteer", "field_worker"}:
        raise ServiceError("Choose a volunteer or field worker.", 400)

    is_delivery = request.request_type in {"delivery", "visit_and_delivery"}
    item = None
    if is_delivery:
        if data.inventory_item_id is None or data.supply_quantity is None:
            raise ServiceError("Choose an inventory item and delivery quantity.", 400)
        item = db.get(InventoryItemModel, data.inventory_item_id)
        if not item:
            raise ServiceError("Inventory item not found.", 404)
        if data.supply_quantity > item.quantity:
            raise ServiceError("There is not enough stock for this delivery.", 409)
    elif data.inventory_item_id is not None or data.supply_quantity is not None:
        raise ServiceError("Visit-only requests cannot reserve delivery stock.", 400)

    before = _snapshot(request)
    due_at = data.due_at
    if due_at and due_at.tzinfo:
        due_at = due_at.astimezone(timezone.utc).replace(tzinfo=None)
    request.assigned_to = assignee.id
    request.assigned_by = actor.id
    request.inventory_item_id = item.id if item else None
    request.supply_quantity = data.supply_quantity if item else None
    request.due_at = due_at
    request.status = "assigned"
    request.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    record_audit(db, actor, "updated", "neighbor_assist", request.id, before, _snapshot(request))
    db.commit()
    db.refresh(request)
    topic = assignee.notification_topic or NTFY_TOPIC
    if topic:
        background_tasks.add_task(
            notify,
            "Neighbor Assist assignment",
            f"Request #{request.id} was assigned to you in {request.general_area}.",
            tags=["volunteer_activism"],
            topic=topic,
        )
    return _view(db, request)


@router.patch(
    "/requests/{request_id}/status",
    response_model=NeighborAssistRequestOut,
)
def update_request_status(
    request_id: int,
    data: NeighborAssistStatusIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    actor=Depends(get_current_user),
):
    request = db.get(NeighborAssistRequestModel, request_id)
    if not request:
        raise ServiceError("Neighbor Assist request not found.", 404)
    if request.status in {"completed", "cancelled"}:
        raise ServiceError("This request is already closed.", 409)

    is_coordinator = actor.role == "coordinator"
    is_creator = actor.id == request.created_by
    is_assignee = actor.id == request.assigned_to
    if data.status == "cancelled":
        if not (is_coordinator or is_creator or is_assignee):
            raise ServiceError("Only the requester, assignee or coordinator can cancel.", 403)
        if is_creator and not is_coordinator and request.status == "in_progress":
            raise ServiceError("Contact the coordinator to cancel an active visit.", 409)
    elif not (is_coordinator or is_assignee):
        raise ServiceError("Only the assigned volunteer or a coordinator can update this request.", 403)

    if data.status == "in_progress" and request.status != "assigned":
        raise ServiceError("Only an assigned request can be started.", 409)
    if data.status == "completed" and request.status not in {"assigned", "in_progress"}:
        raise ServiceError("Only an assigned request can be completed.", 409)

    before = _snapshot(request)
    if data.status == "completed" and request.request_type in {"delivery", "visit_and_delivery"}:
        if request.inventory_item_id is None or request.supply_quantity is None:
            raise ServiceError("A coordinator must assign stock before delivery can be completed.", 409)
        result = db.execute(
            update(InventoryItemModel)
            .where(
                InventoryItemModel.id == request.inventory_item_id,
                InventoryItemModel.quantity >= request.supply_quantity,
            )
            .values(quantity=InventoryItemModel.quantity - request.supply_quantity)
        )
        if result.rowcount != 1:
            raise ServiceError("Stock changed and is no longer sufficient for this delivery.", 409)
        db.add(
            InventoryMovementModel(
                item_id=request.inventory_item_id,
                user_id=actor.id,
                quantity_change=-request.supply_quantity,
                reason=f"Neighbor Assist delivery request #{request.id}",
            )
        )

    request.status = data.status
    request.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    request.completed_at = request.updated_at if data.status == "completed" else None
    record_audit(db, actor, "updated", "neighbor_assist", request.id, before, _snapshot(request))
    db.commit()
    db.refresh(request)
    if data.status == "completed":
        creator = db.get(UserModel, request.created_by)
        topic = creator.notification_topic if creator else None
        topic = topic or NTFY_TOPIC
        if topic:
            background_tasks.add_task(
                notify,
                "Neighbor Assist completed",
                f"Request #{request.id} has been completed.",
                tags=["white_check_mark"],
                topic=topic,
            )
    return _view(db, request)
