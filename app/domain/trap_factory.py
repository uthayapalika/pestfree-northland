from app.domain.traps import PossumTrap, RatTrap, StoatTrap, Trap


class TrapFactory:
    """Factory pattern: builds the correct Trap subclass from a type string."""

    _registry = {"possum": PossumTrap, "rat": RatTrap, "stoat": StoatTrap}

    @classmethod
    def create(cls, trap_type: str, **kwargs) -> Trap:
        trap_class = cls._registry.get(trap_type)
        if trap_class is None:
            raise ValueError(f"Unknown trap type: {trap_type}")
        return trap_class(**kwargs)
