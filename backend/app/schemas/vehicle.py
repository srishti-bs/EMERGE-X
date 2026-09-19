"""Vehicle Pydantic Schemas.

Phase 3: Emergency & Ambulance Management.
"""

from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator


class VehicleBase(BaseModel):
    vehicle_id: str = Field(..., description="Unique vehicle/ambulance identifier")
    vehicle_type: str = Field(default="AMBULANCE", description="Vehicle type")
    rfid_tag: Optional[str] = Field(
        default=None, description="RFID/tag identifier for physical identity read"
    )
    status: str = Field(default="ACTIVE", description="Vehicle operational status")

    @field_validator("vehicle_id")
    @classmethod
    def validate_vehicle_id(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("vehicle_id cannot be empty")
        return v_stripped


class VehicleCreate(VehicleBase):
    pass


class VehicleResponse(VehicleBase):
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    speed: Optional[float] = None
    last_location_time: Optional[datetime] = None
    emergency_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LocationUpdatePayload(BaseModel):
    """Payload for updating vehicle GPS coordinates.
    
    Accepts latitude, longitude, optional timestamp, speed, and emergency_status.
    """
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees (-180 to 180)")
    timestamp: Optional[Union[int, float, datetime]] = Field(
        default=None, description="Timestamp as Unix epoch seconds or ISO datetime string"
    )
    speed: Optional[float] = Field(default=0.0, ge=0.0, description="Speed in km/h")
    emergency_status: Optional[str] = Field(default=None, description="Vehicle emergency state")


class LocationResponse(BaseModel):
    """Response format matching locked telemetry contract."""
    vehicle_id: str
    latitude: float
    longitude: float
    speed: float
    timestamp: int
    emergency_status: str


class SimulatedLocationPayload(BaseModel):
    """Payload for prototype simulation of GPS movement."""
    delta_lat: float = Field(default=0.001, description="Latitude step delta")
    delta_lon: float = Field(default=0.001, description="Longitude step delta")
    speed: float = Field(default=45.0, ge=0.0, description="Simulated speed in km/h")
    emergency_status: str = Field(default="ACTIVE_CRITICAL", description="Simulated emergency state")
