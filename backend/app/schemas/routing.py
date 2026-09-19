"""Routing & Road Network Pydantic Schemas.

Phase 4: MVP Road Network & Routing Engine.
"""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.app.schemas.junction import JunctionResponse


class RoadSegmentBase(BaseModel):
    road_id: str = Field(..., description="Unique road segment identifier (e.g. ROAD-J1-J2)")
    source_junction_id: str = Field(..., description="Origin junction ID")
    target_junction_id: str = Field(..., description="Destination junction ID")
    distance_meters: float = Field(default=500.0, ge=0.0, description="Road segment length in meters")
    base_travel_time_seconds: float = Field(default=30.0, ge=0.0, description="Base free-flow transit time")
    cost: float = Field(default=10.0, ge=0.0, description="Algorithmic traversal cost")
    status: str = Field(default="OPEN", description="Road state (OPEN, BLOCKED, CONGESTED)")


class RoadSegmentCreate(RoadSegmentBase):
    pass


class RoadSegmentResponse(RoadSegmentBase):
    model_config = ConfigDict(from_attributes=True)


class RouteCalculateRequest(BaseModel):
    """Request payload for route calculation."""
    start_junction_id: str = Field(..., description="Origin junction ID for the ambulance")
    destination_junction_id: str = Field(..., description="Destination hospital/junction ID")
    emergency_id: Optional[str] = Field(default=None, description="Associated emergency mission ID")
    vehicle_id: Optional[str] = Field(default=None, description="Associated ambulance vehicle ID")
    current_junction_id: Optional[str] = Field(
        default=None, description="Optional current junction position to filter upcoming corridor"
    )

    @field_validator("start_junction_id", "destination_junction_id")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Junction ID cannot be empty")
        return v_stripped


class RouteCalculateResponse(BaseModel):
    """Response payload matching locked routing architecture."""
    route: List[str] = Field(..., description="Ordered list of junction IDs from start to destination")
    junction_sequence: List[JunctionResponse] = Field(..., description="Ordered details of route junctions")
    total_cost: float = Field(..., description="Aggregated Dijkstra graph cost")
    estimated_travel_time_seconds: float = Field(..., description="Total estimated travel duration in seconds")
    upcoming_junctions: List[str] = Field(
        ..., description="Upcoming junctions along route based on current position"
    )
    emergency_id: Optional[str] = None
    vehicle_id: Optional[str] = None
