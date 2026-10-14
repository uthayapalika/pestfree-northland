
from app.domain.trap_factory import TrapFactory


def test_rat_trap_factory():
    trap = TrapFactory.create(
        "rat",
        id=1,
        code="A",
        trap_line_id=1,
        general_area="x",
        exact_lat=1,
        exact_lng=2,
        is_sensitive=True,
    )

    assert trap.trap_type == "rat"
    assert trap.recommended_bait() == "Peanut butter or chocolate"


def test_sensitive_trap_hides_exact_location():
    trap = TrapFactory.create(
        "rat",
        id=1,
        code="A",
        trap_line_id=1,
        general_area="x",
        exact_lat=1,
        exact_lng=2,
        is_sensitive=True,
    )

    location = trap.visible_location(False)

    assert location["exact_lat"] is None
    assert location["exact_lng"] is None