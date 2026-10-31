import pytest

from app.domain.trap_factory import TrapFactory
from app.domain.traps import (
    HedgehogTrap,
    MouseTrap,
    OtherTrap,
    PossumTrap,
    RatTrap,
    StoatTrap,
    Trap,
)

KW = dict(
    id=1,
    code="A1",
    trap_line_id=1,
    general_area="Area",
    exact_lat=-35.1,
    exact_lng=174.2,
    is_sensitive=True,
)


def test_abstract_trap_cannot_be_created():
    with pytest.raises(TypeError):
        Trap(**KW)


@pytest.mark.parametrize(
    "kind,cls",
    [
        ("possum", PossumTrap),
        ("rat", RatTrap),
        ("stoat", StoatTrap),
        ("mouse", MouseTrap),
        ("hedgehog", HedgehogTrap),
        ("other", OtherTrap),
    ],
)
def test_factory_builds_correct_subclass(kind, cls):
    trap = TrapFactory.create(kind, **KW)
    assert isinstance(trap, cls) and trap.trap_type == kind


def test_factory_rejects_unknown_type():
    with pytest.raises(ValueError):
        TrapFactory.create("dragon", **KW)


def test_polymorphic_bait_differs():
    baits = {
        TrapFactory.create(k, **KW).recommended_bait()
        for k in ("possum", "rat", "stoat")
    }
    assert len(baits) == 3


@pytest.mark.parametrize("kind", ["mouse", "hedgehog", "other"])
def test_added_trap_types_have_generic_bait(kind):
    trap = TrapFactory.create(kind, **KW)
    assert trap.recommended_bait() == "Choose bait suitable for this trap type"


def test_sensitive_location_is_hidden_unless_approved():
    trap = TrapFactory.create("rat", **KW)
    assert trap.visible_location(False) == {"exact_lat": None, "exact_lng": None}
    assert trap.visible_location(True)["exact_lat"] == -35.1
