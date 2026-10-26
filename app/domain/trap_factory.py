from app.domain.traps import (
    HedgehogTrap,
    MouseTrap,
    OtherTrap,
    PossumTrap,
    RatTrap,
    StoatTrap,
    Trap,
)


class TrapFactory:
    """Factory pattern: builds the correct Trap subclass from a type string."""

    _registry = {
        "possum": PossumTrap,
        "rat": RatTrap,
        "stoat": StoatTrap,
        "mouse": MouseTrap,
        "hedgehog": HedgehogTrap,
        "other": OtherTrap,
    }

    @classmethod
    def create(cls, trap_type: str, **kwargs) -> Trap:
        trap_class = cls._registry.get(trap_type)
        if trap_class is None:
            raise ValueError(f"Unknown trap type: {trap_type}")
        return trap_class(**kwargs)
