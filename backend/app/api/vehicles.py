"""Vehicles API Endpoints.

Phase 3: Emergency & Ambulance Management.
"""

from datetime import datetime, timezone
from typing import List, Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.vehicle import EmergencyVehicle
from backend.app.schemas.vehicle import (
    LocationResponse,
    LocationUpdatePayload,
    SimulatedLocationPayload,
    VehicleCreate,
    VehicleResponse,
)

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


def parse_timestamp(ts: Union[int, float, datetime, None]) -> datetime:
    """Safely parse Unix epoch seconds or datetime to UTC datetime."""
    if ts is None:
        return datetime.now(timezone.utc)
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    if isinstance(ts, datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


@router.get("", response_model=List[VehicleResponse])
def get_vehicles(db: Session = Depends(get_db)):
    """Retrieve all registered emergency vehicles from database."""
    return db.query(EmergencyVehicle).all()


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(vehicle_in: VehicleCreate, db: Session = Depends(get_db)):
    """Register a new emergency vehicle in database.
    
    RFID tag is stored as physical tag identity for junction detection.
    """
    existing = (
        db.query(EmergencyVehicle)
        .filter(EmergencyVehicle.vehicle_id == vehicle_in.vehicle_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with ID '{vehicle_in.vehicle_id}' already exists.",
        )
    vehicle = EmergencyVehicle(**vehicle_in.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(vehicle_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific emergency vehicle by vehicle ID."""
    vehicle = (
        db.query(EmergencyVehicle)
        .filter(EmergencyVehicle.vehicle_id == vehicle_id)
        .first()
    )
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{vehicle_id}' not found.",
        )
    return vehicle


@router.post("/{vehicle_id}/location", response_model=LocationResponse)
def update_vehicle_location(
    vehicle_id: str,
    payload: LocationUpdatePayload,
    db: Session = Depends(get_db),
):
    """Update continuous GPS location telemetry for an emergency vehicle.
    
    GPS coordinates represent continuous vehicle position and are persisted
    in the database. RFID is reserved for physical identification.
    """
    vehicle = (
        db.query(EmergencyVehicle)
        .filter(EmergencyVehicle.vehicle_id == vehicle_id)
        .first()
    )
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{vehicle_id}' not found.",
        )

    # Persist latest location coordinates and telemetry
    vehicle.current_latitude = payload.latitude
    vehicle.current_longitude = payload.longitude
    if payload.speed is not None:
        vehicle.speed = payload.speed
    if payload.emergency_status is not None:
        vehicle.emergency_status = payload.emergency_status
    vehicle.last_location_time = parse_timestamp(payload.timestamp)

    db.commit()
    db.refresh(vehicle)

    return LocationResponse(
        vehicle_id=vehicle.vehicle_id,
        latitude=vehicle.current_latitude,
        longitude=vehicle.current_longitude,
        speed=vehicle.speed or 0.0,
        timestamp=int(vehicle.last_location_time.timestamp()),
        emergency_status=vehicle.emergency_status or "IDLE",
    )


@router.post("/{vehicle_id}/simulate-location")
def simulate_vehicle_location(
    vehicle_id: str,
    payload: SimulatedLocationPayload = SimulatedLocationPayload(),
    db: Session = Depends(get_db),
):
    """Prototype simulation endpoint to test GPS location movement without physical ESP32.
    
    Clearly labeled as PROTOTYPE SIMULATION DATA ONLY.
    """
    vehicle = (
        db.query(EmergencyVehicle)
        .filter(EmergencyVehicle.vehicle_id == vehicle_id)
        .first()
    )
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID '{vehicle_id}' not found.",
        )

    # Base coordinates on existing position or city demonstrator centroid
    base_lat = vehicle.current_latitude if vehicle.current_latitude is not None else 12.9715987
    base_lon = vehicle.current_longitude if vehicle.current_longitude is not None else 77.5945627

    vehicle.current_latitude = base_lat + payload.delta_lat
    vehicle.current_longitude = base_lon + payload.delta_lon
    vehicle.speed = payload.speed
    vehicle.emergency_status = payload.emergency_status
    vehicle.last_location_time = datetime.now(timezone.utc)

    db.commit()
    db.refresh(vehicle)

    return {
        "simulated": True,
        "note": "PROTOTYPE SIMULATION DATA ONLY",
        "vehicle_id": vehicle.vehicle_id,
        "latitude": vehicle.current_latitude,
        "longitude": vehicle.current_longitude,
        "speed": vehicle.speed,
        "timestamp": int(vehicle.last_location_time.timestamp()),
        "emergency_status": vehicle.emergency_status,
    }
