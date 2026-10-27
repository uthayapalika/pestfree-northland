from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_coordinator
from app.db.database import get_db
from app.db.models import InventoryItemModel, InventoryMovementModel
from app.errors import ServiceError
from app.schemas import InventoryItemIn, InventoryItemOut, InventoryMovementIn

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def _view(item: InventoryItemModel) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "unit": item.unit,
        "quantity": item.quantity,
        "reorder_level": item.reorder_level,
        "needs_reorder": item.quantity <= item.reorder_level,
        "created_at": item.created_at,
    }


@router.get("", response_model=list[InventoryItemOut])
def list_inventory(db: Session = Depends(get_db), _=Depends(require_coordinator)):
    items = db.scalars(select(InventoryItemModel).order_by(InventoryItemModel.name)).all()
    return [_view(item) for item in items]


@router.post("", response_model=InventoryItemOut, status_code=201)
def create_item(
    data: InventoryItemIn,
    db: Session = Depends(get_db),
    _=Depends(require_coordinator),
):
    item = InventoryItemModel(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _view(item)


@router.put("/{item_id}", response_model=InventoryItemOut)
def update_item(
    item_id: int,
    data: InventoryItemIn,
    db: Session = Depends(get_db),
    _=Depends(require_coordinator),
):
    item = db.get(InventoryItemModel, item_id)
    if not item:
        raise ServiceError("Inventory item not found.", 404)
    for field, value in data.model_dump(exclude={"quantity"}).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _view(item)


@router.post("/{item_id}/movements", response_model=InventoryItemOut)
def record_movement(
    item_id: int,
    data: InventoryMovementIn,
    db: Session = Depends(get_db),
    actor=Depends(require_coordinator),
):
    item = db.get(InventoryItemModel, item_id)
    if not item:
        raise ServiceError("Inventory item not found.", 404)
    if data.quantity_change == 0:
        raise ServiceError("The stock change cannot be zero.", 400)
    next_quantity = item.quantity + data.quantity_change
    if next_quantity < 0:
        raise ServiceError("Stock cannot fall below zero.", 400)
    item.quantity = next_quantity
    db.add(InventoryMovementModel(
        item_id=item.id,
        user_id=actor.id,
        quantity_change=data.quantity_change,
        reason=data.reason,
    ))
    db.commit()
    db.refresh(item)
    return _view(item)
