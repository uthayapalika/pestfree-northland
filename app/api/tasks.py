from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_coordinator
from app.api.ntfy import NTFY_TOPIC, notify
from app.db.database import get_db
from app.db.models import (
    FieldTaskModel,
    TrapLineAssignmentModel,
    TrapLineModel,
    TrapModel,
    UserModel,
)
from app.errors import ServiceError
from app.schemas import (
    FieldTaskIn,
    FieldTaskOut,
    FieldTaskStatusIn,
    TrapLineAssignmentIn,
    TrapLineAssignmentOut,
)
from app.services.audit import record_audit

router = APIRouter(tags=["Field assignments"])


def _task_view(db: Session, task: FieldTaskModel) -> dict:
    assigned = db.get(UserModel, task.assigned_to)
    trap = db.get(TrapModel, task.trap_id) if task.trap_id else None
    line_id = task.trap_line_id or (trap.trap_line_id if trap else None)
    line = db.get(TrapLineModel, line_id) if line_id else None
    return {
        "id": task.id,
        "trap_id": task.trap_id,
        "trap_line_id": line_id,
        "trap_code": trap.code if trap else None,
        "trap_line": line.name if line else None,
        "assigned_to": task.assigned_to,
        "assigned_name": assigned.name if assigned else "Former user",
        "assigned_by": task.assigned_by,
        "title": task.title,
        "notes": task.notes,
        "due_at": task.due_at,
        "status": task.status,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
    }


def _task_snapshot(task: FieldTaskModel) -> dict:
    return {
        "trap_id": task.trap_id,
        "trap_line_id": task.trap_line_id,
        "assigned_to": task.assigned_to,
        "title": task.title,
        "notes": task.notes,
        "due_at": task.due_at.isoformat() if task.due_at else None,
        "status": task.status,
    }


def _assignment_view(
    assignment: TrapLineAssignmentModel, db: Session
) -> dict:
    assigned_user = db.get(UserModel, assignment.user_id)
    return {
        "id": assignment.id,
        "trap_line_id": assignment.trap_line_id,
        "user_id": assignment.user_id,
        "user_name": assigned_user.name if assigned_user else "Former user",
        "assigned_by": assignment.assigned_by,
        "assigned_at": assignment.assigned_at,
    }


@router.get("/tasks", response_model=list[FieldTaskOut])
def list_tasks(db: Session = Depends(get_db), user=Depends(get_current_user)):
    statement = select(FieldTaskModel).order_by(
        FieldTaskModel.status, FieldTaskModel.due_at, FieldTaskModel.id.desc()
    )
    if user.role != "coordinator":
        statement = statement.where(FieldTaskModel.assigned_to == user.id)
    return [_task_view(db, task) for task in db.scalars(statement)]


@router.post("/tasks", response_model=FieldTaskOut, status_code=201)
def create_task(
    data: FieldTaskIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    actor=Depends(require_coordinator),
):
    if not data.trap_id and not data.trap_line_id:
        raise ServiceError("Choose a trap or trap line for the task.", 400)
    assignee = db.get(UserModel, data.assigned_to)
    if not assignee or assignee.role not in {"volunteer", "field_worker"}:
        raise ServiceError("Tasks can only be assigned to volunteers or field workers.", 400)
    trap = db.get(TrapModel, data.trap_id) if data.trap_id else None
    if data.trap_id and not trap:
        raise ServiceError("Trap not found.", 404)
    if trap and data.trap_line_id and trap.trap_line_id != data.trap_line_id:
        raise ServiceError("The selected trap does not belong to the selected trap line.", 400)
    line_id = data.trap_line_id or (trap.trap_line_id if trap else None)
    line = db.get(TrapLineModel, line_id) if line_id else None
    if not line:
        raise ServiceError("Trap line not found.", 404)

    due_at = data.due_at
    if due_at and due_at.tzinfo:
        due_at = due_at.astimezone(timezone.utc).replace(tzinfo=None)
    task = FieldTaskModel(
        trap_id=data.trap_id,
        trap_line_id=data.trap_line_id,
        assigned_to=assignee.id,
        assigned_by=actor.id,
        title=data.title,
        notes=data.notes,
        due_at=due_at,
    )
    db.add(task)
    db.flush()
    record_audit(db, actor, "created", "task", task.id, None, _task_snapshot(task))
    db.commit()
    db.refresh(task)

    topic = assignee.notification_topic or NTFY_TOPIC
    if topic:
        background_tasks.add_task(
            notify,
            "New field task",
            f"{task.title} — {line.name}"
            + (f" (trap {trap.code})" if trap else "")
            + (f"; due {due_at:%Y-%m-%d}" if due_at else ""),
            tags=["clipboard"],
            topic=topic,
        )
    return _task_view(db, task)


@router.patch("/tasks/{task_id}", response_model=FieldTaskOut)
def update_task_status(
    task_id: int,
    data: FieldTaskStatusIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    task = db.get(FieldTaskModel, task_id)
    if not task:
        raise ServiceError("Task not found.", 404)
    if user.role != "coordinator" and task.assigned_to != user.id:
        raise ServiceError("This task is assigned to another user.", 403)
    before = _task_snapshot(task)
    task.status = data.status
    task.completed_at = (
        datetime.now(timezone.utc).replace(tzinfo=None)
        if data.status == "completed"
        else None
    )
    record_audit(db, user, "updated", "task", task.id, before, _task_snapshot(task))
    db.commit()
    db.refresh(task)
    return _task_view(db, task)


@router.get(
    "/trap-lines/{line_id}/assignments",
    response_model=list[TrapLineAssignmentOut],
)
def list_line_assignments(
    line_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_coordinator),
):
    if not db.get(TrapLineModel, line_id):
        raise ServiceError("Trap line not found.", 404)
    assignments = db.scalars(
        select(TrapLineAssignmentModel)
        .where(TrapLineAssignmentModel.trap_line_id == line_id)
        .order_by(TrapLineAssignmentModel.assigned_at.desc())
    )
    return [_assignment_view(assignment, db) for assignment in assignments]


@router.get(
    "/my/trap-line-assignments",
    response_model=list[TrapLineAssignmentOut],
)
def list_my_line_assignments(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    assignments = db.scalars(
        select(TrapLineAssignmentModel)
        .where(TrapLineAssignmentModel.user_id == user.id)
        .order_by(TrapLineAssignmentModel.assigned_at.desc())
    )
    return [_assignment_view(assignment, db) for assignment in assignments]


@router.post(
    "/trap-lines/{line_id}/assignments",
    response_model=TrapLineAssignmentOut,
    status_code=status.HTTP_201_CREATED,
)
def assign_line(
    line_id: int,
    data: TrapLineAssignmentIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    actor=Depends(require_coordinator),
):
    line = db.get(TrapLineModel, line_id)
    if not line:
        raise ServiceError("Trap line not found.", 404)
    assignee = db.get(UserModel, data.user_id)
    if not assignee or assignee.role not in {"volunteer", "field_worker"}:
        raise ServiceError("Trap lines can only be assigned to volunteers or field workers.", 400)
    existing = db.scalar(
        select(TrapLineAssignmentModel).where(
            TrapLineAssignmentModel.trap_line_id == line_id,
            TrapLineAssignmentModel.user_id == assignee.id,
        )
    )
    if existing:
        return _assignment_view(existing, db)

    assignment = TrapLineAssignmentModel(
        trap_line_id=line_id, user_id=assignee.id, assigned_by=actor.id
    )
    db.add(assignment)
    db.flush()
    record_audit(
        db,
        actor,
        "created",
        "trap_line_assignment",
        assignment.id,
        None,
        {"trap_line_id": line_id, "user_id": assignee.id},
    )
    db.commit()
    db.refresh(assignment)

    topic = assignee.notification_topic or NTFY_TOPIC
    if topic:
        background_tasks.add_task(
            notify,
            "Trap line assigned",
            f"{line.name} ({line.general_area}) was assigned to you.",
            tags=["clipboard"],
            topic=topic,
        )
    return _assignment_view(assignment, db)


@router.delete("/trap-line-assignments/{assignment_id}", status_code=204)
def remove_line_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    actor=Depends(require_coordinator),
):
    assignment = db.get(TrapLineAssignmentModel, assignment_id)
    if not assignment:
        raise ServiceError("Assignment not found.", 404)
    record_audit(
        db,
        actor,
        "deleted",
        "trap_line_assignment",
        assignment.id,
        {"trap_line_id": assignment.trap_line_id, "user_id": assignment.user_id},
        None,
    )
    db.delete(assignment)
    db.commit()
