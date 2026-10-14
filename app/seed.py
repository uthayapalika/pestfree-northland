"""Creates sample data:  python -m app.seed   (WARNING: wipes the database first)"""

from datetime import datetime

from app.db import models  # noqa: F401
from app.db.database import Base, SessionLocal, engine
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
    db.close()
    print("Sample data created.")
    print("Coordinator: coordinator@example.com / Coord1234")
    print("Volunteer:   volunteer@example.com / Volun1234")


if __name__ == "__main__":
    seed()
