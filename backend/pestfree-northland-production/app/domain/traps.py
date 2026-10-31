from abc import ABC, abstractmethod


class Trap(ABC):
    """Abstract base class for all trap types."""

    def __init__(
        self,
        id,
        code,
        trap_line_id,
        general_area,
        exact_lat,
        exact_lng,
        is_sensitive,
        status="active",
        inspection_interval_days=14,
    ):
        self.id = id
        self.code = code
        self.trap_line_id = trap_line_id
        self.general_area = general_area
        self.is_sensitive = is_sensitive
        self.status = status
        self.inspection_interval_days = inspection_interval_days
        self.__lat = exact_lat  # private: name-mangled (encapsulation)
        self.__lng = exact_lng

    @property
    @abstractmethod
    def trap_type(self) -> str: ...

    @abstractmethod
    def recommended_bait(self) -> str: ...

    def visible_location(self, can_view_exact: bool) -> dict:
        """Only approved users see exact coordinates of sensitive traps."""
        if self.is_sensitive and not can_view_exact:
            return {"exact_lat": None, "exact_lng": None}
        return {"exact_lat": self.__lat, "exact_lng": self.__lng}


class PossumTrap(Trap):
    @property
    def trap_type(self) -> str:
        return "possum"

    def recommended_bait(self) -> str:
        return "Apple or peanut butter"


class RatTrap(Trap):
    @property
    def trap_type(self) -> str:
        return "rat"

    def recommended_bait(self) -> str:
        return "Peanut butter or chocolate"


class StoatTrap(Trap):
    @property
    def trap_type(self) -> str:
        return "stoat"

    def recommended_bait(self) -> str:
        return "Fresh egg or rabbit meat"


class MouseTrap(Trap):
    @property
    def trap_type(self) -> str:
        return "mouse"

    def recommended_bait(self) -> str:
        return "Choose bait suitable for this trap type"


class HedgehogTrap(Trap):
    @property
    def trap_type(self) -> str:
        return "hedgehog"

    def recommended_bait(self) -> str:
        return "Choose bait suitable for this trap type"


class OtherTrap(Trap):
    @property
    def trap_type(self) -> str:
        return "other"

    def recommended_bait(self) -> str:
        return "Choose bait suitable for this trap type"
