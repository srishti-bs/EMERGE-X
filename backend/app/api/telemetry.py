"""Telemetry API Endpoints matching locked docs/integration-contract.md.

Phase 3: Emergency & Ambulance Management.
"""

from datetime import datetime, timezone
from typing import Union
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.vehicle import EmergencyVehicle

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


class AmbulanceTelemetryPayload(BaseModel):
    """Locked contract payload for ESP32 #1 -> Backend telemetry."""
    vehicle_id: str
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    speed: float = Field(default=0.0, ge=0.0)
    timestamp: Union[int, float, datetime]
    emergency_status: str = "ACTIVE_CRITICAL"


@router.post("/ambulance", status_code=status.HTTP_200_OK)
def ingest_ambulance_telemetry(
    payload: AmbulanceTelemetryPayload,
    db: Session = Depends(get_db),
):
    """Ingest telemetry directly matching docs/integration-contract.md Section 1."""
    vehicle = (
        db.query(EmergencyVehicle)
        .filter(EmergencyVehicle.vehicle_id == payload.vehicle_id)
        .first()
    )
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle '{payload.vehicle_id}' not found. Register vehicle before sending telemetry.",
        )

    # Convert timestamp (default to current UTC if 0 or uninitialized)
    if isinstance(payload.timestamp, (int, float)) and payload.timestamp > 1000000000:
        ts = datetime.fromtimestamp(payload.timestamp, tz=timezone.utc)
    elif isinstance(payload.timestamp, datetime):
        ts = payload.timestamp if payload.timestamp.tzinfo else payload.timestamp.replace(tzinfo=timezone.utc)
    else:
        ts = datetime.now(timezone.utc)

    vehicle.current_latitude = payload.latitude
    vehicle.current_longitude = payload.longitude
    vehicle.speed = payload.speed
    vehicle.last_location_time = ts
    vehicle.emergency_status = payload.emergency_status

    db.commit()
    db.refresh(vehicle)

    return {
        "status": "received",
        "vehicle_id": vehicle.vehicle_id,
        "latitude": vehicle.current_latitude,
        "longitude": vehicle.current_longitude,
        "speed": vehicle.speed,
        "timestamp": int(vehicle.last_location_time.timestamp()),
        "emergency_status": vehicle.emergency_status,
    }
