"""Emergencies API Endpoints.

Phase 5: MVP Emergency Priority & Moving Green Corridor.
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.emergency import Emergency
from backend.app.models.vehicle import EmergencyVehicle
from backend.app.schemas.emergency import (
    EmergencyCreate,
    EmergencyResponse,
    EmergencyUpdate,
    VALID_EMERGENCY_STATUSES,
)
from backend.app.schemas.priority import EmergencyPriorityResponse, StepCorridorRequest
from backend.app.services.priority import PriorityEngineService

router = APIRouter(prefix="/emergencies", tags=["Emergencies"])


@router.get("", response_model=List[EmergencyResponse])
def get_emergencies(db: Session = Depends(get_db)):
    """Retrieve all emergency incidents from database."""
    return db.query(Emergency).all()


@router.post("", response_model=EmergencyResponse, status_code=status.HTTP_201_CREATED)
def create_emergency(emergency_in: EmergencyCreate, db: Session = Depends(get_db)):
    """Create a new emergency record in database."""
    existing = (
        db.query(Emergency)
        .filter(Emergency.emergency_id == emergency_in.emergency_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Emergency with ID '{emergency_in.emergency_id}' already exists.",
        )

    # If vehicle_id is provided, verify it exists
    if emergency_in.vehicle_id:
        vehicle = (
            db.query(EmergencyVehicle)
            .filter(EmergencyVehicle.vehicle_id == emergency_in.vehicle_id)
            .first()
        )
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle with ID '{emergency_in.vehicle_id}' not found.",
            )

    emergency = Emergency(**emergency_in.model_dump())
    db.add(emergency)
    db.commit()
    db.refresh(emergency)
    return emergency


@router.get("/{emergency_id}", response_model=EmergencyResponse)
def get_emergency(emergency_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific emergency incident by emergency ID."""
    emergency = (
        db.query(Emergency)
        .filter(Emergency.emergency_id == emergency_id)
        .first()
    )
    if not emergency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency with ID '{emergency_id}' not found.",
        )
    return emergency


@router.patch("/{emergency_id}", response_model=EmergencyResponse)
def update_emergency(
    emergency_id: str,
    emergency_update: EmergencyUpdate,
    db: Session = Depends(get_db),
):
    """Update an emergency record status or details.
    
    Supported statuses: ACTIVE, COMPLETED, CANCELLED.
    """
    emergency = (
        db.query(Emergency)
        .filter(Emergency.emergency_id == emergency_id)
        .first()
    )
    if not emergency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency with ID '{emergency_id}' not found.",
        )

    update_data = emergency_update.model_dump(exclude_unset=True)

    # Validate vehicle_id if being updated
    if "vehicle_id" in update_data and update_data["vehicle_id"] is not None:
        vehicle = (
            db.query(EmergencyVehicle)
            .filter(EmergencyVehicle.vehicle_id == update_data["vehicle_id"])
            .first()
        )
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle with ID '{update_data['vehicle_id']}' not found.",
            )

    # Validate status if being updated
    if "status" in update_data and update_data["status"] is not None:
        status_val = update_data["status"].upper()
        if status_val not in VALID_EMERGENCY_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{update_data['status']}'. Allowed statuses: {', '.join(sorted(VALID_EMERGENCY_STATUSES))}",
            )
        update_data["status"] = status_val

    for field, value in update_data.items():
        setattr(emergency, field, value)

    emergency.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(emergency)
    return emergency


@router.get("/{emergency_id}/priority", response_model=EmergencyPriorityResponse)
def get_emergency_priority(
    emergency_id: str,
    current_junction_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Retrieve the moving green corridor priority states for an active emergency.
    
    Returns structured data with route, current priority junction,
    junction priority states, and downstream command representations.
    """
    return PriorityEngineService.get_emergency_priority(
        db=db,
        emergency_id=emergency_id,
        current_junction_id=current_junction_id,
    )


@router.post("/{emergency_id}/step-corridor", response_model=EmergencyPriorityResponse)
def step_emergency_corridor(
    emergency_id: str,
    payload: StepCorridorRequest = StepCorridorRequest(),
    db: Session = Depends(get_db),
):
    """Advance ambulance progress along the corridor (prototype simulation helper)."""
    return PriorityEngineService.step_corridor_progress(
        db=db,
        emergency_id=emergency_id,
        target_junction_id=payload.next_junction_id,
    )
