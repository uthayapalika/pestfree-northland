"""Creates sample data:  python -m app.seed   (WARNING: wipes the database first)"""

from datetime import datetime

from app.db import models  # noqa: F401
from app.db.database import Base, SessionLocal, engine
from app.db.models import (
    AuditLogModel,
    FieldTaskModel,
    InventoryItemModel,
    InventoryMovementModel,
    TrapLineAssignmentModel,
)
from app.db.repositories import (
    CheckRepository,
    TrapLineRepository,
    TrapRepository,
    UserRepository,
)
from app.services.auth_service import hash_password


def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    users, lines, traps, checks = (
        UserRepository(db),
        TrapLineRepository(db),
        TrapRepository(db),
        CheckRepository(db),
    )

    coord = users.add(
        "Aroha Coordinator",
        "coordinator@example.com",
        hash_password("Coord1234"),
        "coordinator",
    )
    vol = users.add(
        "Tane Volunteer",
        "volunteer@example.com",
        hash_password("Volun1234"),
        "volunteer",
    )
    users.add(
        "Mere Volunteer",
        "mere@example.com",
        hash_password("Volun1234"),
        "volunteer",
        True,
    )
    field_worker = users.add(
        "Kai Field Worker",
        "field@example.com",
        hash_password("Field1234"),
        "field_worker",
    )

    line1 = lines.add("Bream Head Track", "Whangarei Heads", coord.id)
    line2 = lines.add("Mair Park Loop", "Whangarei", coord.id)

    t1 = traps.add(
        line1.id, "BH-01", "possum", "Whangarei Heads", -35.8393, 174.5590, False
    )
    t2 = traps.add(
        line1.id, "BH-02", "rat", "Whangarei Heads", -35.8401, 174.5602, False
    )
    t3 = traps.add(
        line1.id, "BH-03", "stoat", "Whangarei Heads", -35.8412, 174.5611, True
    )
    t4 = traps.add(line2.id, "MP-01", "rat", "Whangarei", -35.7290, 174.3170, False)

    c1 = checks.add_check(
        t1.id, vol.id, "caught", "Fresh possum", datetime(2026, 9, 10, 9, 0)
    )
    checks.add_catch(c1.id, t1.id, "possum", c1.checked_at)
    checks.add_check(t2.id, vol.id, "empty", "", datetime(2026, 9, 10, 9, 20))
    c3 = checks.add_check(
        t3.id, vol.id, "caught", "Stoat caught", datetime(2026, 10, 2, 8, 30)
    )
    checks.add_catch(c3.id, t3.id, "stoat", c3.checked_at)
    c4 = checks.add_check(t4.id, coord.id, "caught", "", datetime(2026, 10, 5, 10, 0))
    checks.add_catch(c4.id, t4.id, "rat", c4.checked_at)
    checks.add_check(
        t4.id, vol.id, "bait_needed", "Bait gone", datetime(2026, 10, 9, 10, 0)
    )

    items = [
        InventoryItemModel(
            name="Fresh Possum Lure",
            category="bait",
            unit="packs",
            quantity=18,
            reorder_level=12,
        ),
        InventoryItemModel(
            name="DOC 200 traps",
            category="equipment",
            unit="items",
            quantity=7,
            reorder_level=10,
        ),
        InventoryItemModel(
            name="UV trap marker tags",
            category="maintenance",
            unit="packets",
            quantity=24,
            reorder_level=5,
        ),
        InventoryItemModel(
            name="Replacement trap springs",
            category="maintenance",
            unit="pairs",
            quantity=3,
            reorder_level=8,
        ),
    ]
    db.add_all(items)
    db.flush()
    db.add_all([
        InventoryMovementModel(
            item_id=items[0].id,
            user_id=coord.id,
            quantity_change=24,
            reason="Initial monthly bait delivery",
            recorded_at=datetime(2026, 10, 18, 8, 30),
        ),
        InventoryMovementModel(
            item_id=items[0].id,
            user_id=vol.id,
            quantity_change=-6,
            reason="Restocked Bream Head Track",
            recorded_at=datetime(2026, 10, 24, 14, 10),
        ),
        InventoryMovementModel(
            item_id=items[1].id,
            user_id=coord.id,
            quantity_change=-3,
            reason="Issued traps for Mair Park loop",
            recorded_at=datetime(2026, 10, 25, 9, 15),
        ),
        InventoryMovementModel(
            item_id=items[3].id,
            user_id=vol.id,
            quantity_change=-5,
            reason="Spring replacement during inspection",
            recorded_at=datetime(2026, 10, 26, 11, 45),
        ),
    ])

    db.add_all([
        TrapLineAssignmentModel(
            trap_line_id=line1.id,
            user_id=vol.id,
            assigned_by=coord.id,
            assigned_at=datetime(2026, 10, 20, 7, 30),
        ),
        TrapLineAssignmentModel(
            trap_line_id=line2.id,
            user_id=vol.id,
            assigned_by=coord.id,
            assigned_at=datetime(2026, 10, 21, 7, 45),
        ),
    ])
    db.flush()

    db.add_all([
        FieldTaskModel(
            trap_id=t1.id,
            trap_line_id=line1.id,
            assigned_to=vol.id,
            assigned_by=coord.id,
            title="Reset BH-01 and replace lure",
            notes="Confirm the trap is stable and clear nearby vegetation.",
            due_at=datetime(2026, 10, 29, 23, 59),
            status="open",
        ),
        FieldTaskModel(
            trap_line_id=line1.id,
            assigned_to=vol.id,
            assigned_by=coord.id,
            title="Inspect Bream Head upper loop",
            notes="Check all traps and record bait, sprung or catch status.",
            due_at=datetime(2026, 10, 27, 23, 59),
            status="open",
        ),
        FieldTaskModel(
            trap_id=t4.id,
            trap_line_id=line2.id,
            assigned_to=field_worker.id,
            assigned_by=coord.id,
            title="Verify Mair Park boundary camera",
            notes="Confirm the nearby monitoring point is accessible.",
            due_at=datetime(2026, 10, 24, 23, 59),
            status="completed",
            completed_at=datetime(2026, 10, 24, 15, 20),
        ),
    ])

    db.add_all([
        AuditLogModel(
            actor_id=coord.id,
            actor_name=coord.name,
            action="created",
            entity_type="trap",
            entity_id=t1.id,
            changed_at=datetime(2026, 10, 18, 8, 0),
            before=None,
            after={"code": t1.code, "status": t1.status},
        ),
        AuditLogModel(
            actor_id=coord.id,
            actor_name=coord.name,
            action="updated",
            entity_type="trap",
            entity_id=t3.id,
            changed_at=datetime(2026, 10, 22, 12, 10),
            before={"inspection_interval_days": 14},
            after={"inspection_interval_days": 7},
        ),
        AuditLogModel(
            actor_id=vol.id,
            actor_name=vol.name,
            action="created",
            entity_type="catch",
            entity_id=c1.id,
            changed_at=datetime(2026, 10, 24, 9, 5),
            before=None,
            after={"species": "possum", "trap_id": t1.id},
        ),
        AuditLogModel(
            actor_id=coord.id,
            actor_name=coord.name,
            action="created",
            entity_type="trap_line",
            entity_id=line2.id,
            changed_at=datetime(2026, 10, 21, 7, 45),
            before=None,
            after={"name": line2.name, "general_area": line2.general_area},
        ),
        AuditLogModel(
            actor_id=coord.id,
            actor_name=coord.name,
            action="created",
            entity_type="task",
            entity_id=1,
            changed_at=datetime(2026, 10, 26, 10, 0),
            before=None,
            after={"title": "Reset BH-01 and replace lure", "assigned_to": vol.id},
        ),
    ])
    db.commit()
    db.close()
    print("Sample data created.")
    print("Coordinator: coordinator@example.com / Coord1234")
    print("Volunteer:   volunteer@example.com / Volun1234")
    print("Field worker: field@example.com / Field1234")


if __name__ == "__main__":
    seed()
