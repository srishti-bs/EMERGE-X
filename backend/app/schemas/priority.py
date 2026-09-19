"""Emergency Priority & Moving Green Corridor Schemas.

Phase 5: MVP Emergency Priority & Moving Green Corridor.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class JunctionStateItem(BaseModel):
    junction_id: str
    state: str = Field(..., description="Priority state (NORMAL, PREPARING, ACTIVE_PRIORITY, COMPLETED)")


class JunctionCommandItem(BaseModel):
    """Internal representation matching docs/integration-contract.md Section 3 for Phase 6."""
    junction_id: str
    state: str
    timing: Dict[str, int] = Field(
        default_factory=lambda: {
            "yellow_transition_sec": 3,
            "all_red_clearance_sec": 2,
            "green_corridor_sec": 30,
            "max_hold_sec": 45,
        }
    )
    vehicle_id: Optional[str] = None
    trip_id: Optional[str] = None


class AmbulanceLocationInfo(BaseModel):
    latitude: float
    longitude: float
    speed: float = 0.0
    timestamp: Optional[int] = None
    emergency_status: Optional[str] = None


class EmergencyPriorityResponse(BaseModel):
    """Structured response for emergency moving priority corridor."""
    emergency_id: str
    vehicle_id: Optional[str] = None
    route: List[str] = Field(..., description="Full planned route junction sequence")
    current_priority_junction: Optional[str] = Field(
        None, description="Junction currently granted ACTIVE_PRIORITY"
    )
    junction_priority_states: Dict[str, str] = Field(
        ..., description="Map of junction_id -> state (COMPLETED, ACTIVE_PRIORITY, PREPARING, NORMAL)"
    )
    junction_states_list: List[JunctionStateItem] = Field(
        ..., description="Ordered list of junction states along the active route"
    )
    current_ambulance_location: Optional[AmbulanceLocationInfo] = None
    junction_commands: List[JunctionCommandItem] = Field(
        ..., description="Internal command representation prepared for junction controllers"
    )


class StepCorridorRequest(BaseModel):
    """Request payload to manually or synthetically step ambulance progress along the corridor."""
    next_junction_id: Optional[str] = Field(
        None, description="Directly advance active priority to this junction ID"
    )
