"""Pydantic Schemas Package.

Phase 5: MVP Emergency Priority & Moving Green Corridor.
"""

from backend.app.schemas.emergency import (
    EmergencyBase,
    EmergencyCreate,
    EmergencyResponse,
    EmergencyUpdate,
    VALID_EMERGENCY_STATUSES,
)
from backend.app.schemas.junction import JunctionBase, JunctionCreate, JunctionResponse
from backend.app.schemas.priority import (
    AmbulanceLocationInfo,
    EmergencyPriorityResponse,
    JunctionCommandItem,
    JunctionStateItem,
    StepCorridorRequest,
)
from backend.app.schemas.routing import (
    RoadSegmentBase,
    RoadSegmentCreate,
    RoadSegmentResponse,
    RouteCalculateRequest,
    RouteCalculateResponse,
)
from backend.app.schemas.vehicle import (
    LocationResponse,
    LocationUpdatePayload,
    SimulatedLocationPayload,
    VehicleBase,
    VehicleCreate,
    VehicleResponse,
)

__all__ = [
    "AmbulanceLocationInfo",
    "EmergencyBase",
    "EmergencyCreate",
    "EmergencyPriorityResponse",
    "EmergencyResponse",
    "EmergencyUpdate",
    "JunctionBase",
    "JunctionCommandItem",
    "JunctionCreate",
    "JunctionResponse",
    "JunctionStateItem",
    "LocationResponse",
    "LocationUpdatePayload",
    "RoadSegmentBase",
    "RoadSegmentCreate",
    "RoadSegmentResponse",
    "RouteCalculateRequest",
    "RouteCalculateResponse",
    "SimulatedLocationPayload",
    "StepCorridorRequest",
    "VALID_EMERGENCY_STATUSES",
    "VehicleBase",
    "VehicleCreate",
    "VehicleResponse",
]
