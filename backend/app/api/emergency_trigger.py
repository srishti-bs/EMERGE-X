"""Live Emergency Trigger & State API Endpoints.

Handles ESP32 physical push-button trigger, emergency clear, and live state reporting.
Reuses existing Dijkstra routing and moving green corridor priority engine.
"""

import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.emergency import Emergency
from backend.app.models.vehicle import EmergencyVehicle
from backend.app.schemas.emergency_trigger import (
    EmergencyClearRequest,
    EmergencyClearResponse,
    EmergencyTriggerRequest,
    EmergencyTriggerResponse,
    LiveEmergencyStateResponse,
)
from backend.app.services.priority import PriorityEngineService
from backend.app.services.routing import RoutingService

router = APIRouter(prefix="/emergency", tags=["Live Emergency Core"])

# In-memory registry for hardware activity tracking (persists across requests during server lifecycle)
_hardware_registry = {
    "last_button_time": None,         # datetime of last push button event
    "last_telemetry_time": None,      # datetime of last GPS telemetry packet
    "last_trigger_source": None,      # "PUSH_BUTTON"
    "is_active_push_trigger": False,  # True if currently triggered by physical button
}

# Freshness window in seconds to declare hardware actively live
HARDWARE_FRESHNESS_WINDOW_SEC = 30.0


def _get_hardware_status(is_demo: bool = False) -> str:
    """Evaluate current hardware status without fabricating live data."""
    if is_demo:
        return "DEMO"

    now = datetime.now(timezone.utc)
    last_btn = _hardware_registry.get("last_button_time")
    last_tel = _hardware_registry.get("last_telemetry_time")

    # Check if we have received a button or telemetry packet in the freshness window
    btn_fresh = last_btn and (now - last_btn).total_seconds() < HARDWARE_FRESHNESS_WINDOW_SEC
    tel_fresh = last_tel and (now - last_tel).total_seconds() < HARDWARE_FRESHNESS_WINDOW_SEC

    if btn_fresh or tel_fresh:
        return "LIVE HARDWARE"

    # If we have seen hardware before, but it's now stale
    if last_btn or last_tel:
        return "PENDING"

    # No hardware communication has ever taken place
    return "OFFLINE"


@router.post("/trigger", response_model=EmergencyTriggerResponse, status_code=status.HTTP_200_OK)
def trigger_emergency(
    payload: EmergencyTriggerRequest,
    db: Session = Depends(get_db),
):
    """Trigger an emergency event via physical ESP32 push button.
    
    Idempotent & debounce-safe: if already ACTIVE, maintains and refreshes state
    without crashing, throwing errors, or creating duplicate incidents.
    """
    now_utc = datetime.now(timezone.utc)
    trigger_src = (payload.trigger_source or "PUSH_BUTTON").upper()

    if trigger_src != "PUSH_BUTTON":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid trigger_source '{payload.trigger_source}'. Only 'PUSH_BUTTON' is accepted for physical emergency triggers.",
        )

    ambulance_id = payload.ambulance_id or "AX-01"

    # 1. Verify or ensure vehicle exists
    vehicle = (
        db.query(EmergencyVehicle)
        .filter(EmergencyVehicle.vehicle_id == ambulance_id)
        .first()
    )
    if not vehicle:
        vehicle = EmergencyVehicle(
            vehicle_id=ambulance_id,
            vehicle_type="AMBULANCE",
            status="ACTIVE",
            emergency_status="ACTIVE_CRITICAL",
            last_location_time=now_utc,
        )
        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)
    else:
        vehicle.emergency_status = "ACTIVE_CRITICAL"
        vehicle.last_location_time = now_utc
        db.commit()

    # 2. Verify or create active emergency incident E-001
    emergency = (
        db.query(Emergency)
        .filter(Emergency.emergency_id == "E-001")
        .first()
    )
    is_new = False
    if not emergency:
        is_new = True
        emergency = Emergency(
            emergency_id="E-001",
            vehicle_id=ambulance_id,
            emergency_type=payload.emergency_type or "CARDIAC_CRITICAL",
            details="Triggered via physical ESP32 push button",
            destination_hospital="City General Emergency Center",
            destination_junction_id=payload.destination_junction_id or "J4",
            current_corridor_junction_id="J2",
            current_route=json.dumps(["J1", "J2", "J3", "J4"]),
            status="ACTIVE",
            created_at=now_utc,
            updated_at=now_utc,
        )
        db.add(emergency)
        db.commit()
        db.refresh(emergency)
    else:
        emergency.status = "ACTIVE"
        emergency.updated_at = now_utc
        if not emergency.current_route:
            emergency.current_route = json.dumps(["J1", "J2", "J3", "J4"])
        if not emergency.current_corridor_junction_id:
            emergency.current_corridor_junction_id = "J2"
        db.commit()

    # 3. Ensure route integrity using existing Dijkstra Routing engine if needed
    try:
        current_route_list = json.loads(emergency.current_route) if emergency.current_route else []
    except Exception:
        current_route_list = []

    if not current_route_list or len(current_route_list) < 2:
        dest = emergency.destination_junction_id or "J4"
        try:
            calc_res = RoutingService.process_route_calculation(
                db=db,
                start_junction_id="J1",
                destination_junction_id=dest,
                emergency_id=emergency.emergency_id,
                vehicle_id=vehicle.vehicle_id,
            )
            current_route_list = calc_res.get("route", ["J1", "J2", "J3", "J4"])
        except Exception:
            current_route_list = ["J1", "J2", "J3", "J4"]
            emergency.current_route = json.dumps(current_route_list)
            db.commit()

    # 4. Activate moving green corridor using existing Priority Engine
    priority_res = PriorityEngineService.get_emergency_priority(
        db=db,
        emergency_id=emergency.emergency_id,
        current_junction_id=emergency.current_corridor_junction_id or "J2",
    )

    # 5. Record hardware activity timestamp in registry
    _hardware_registry["last_button_time"] = now_utc
    _hardware_registry["last_trigger_source"] = "PUSH_BUTTON"
    _hardware_registry["is_active_push_trigger"] = True

    return EmergencyTriggerResponse(
        status="ACTIVATED" if is_new else "ACTIVE_MAINTAINED",
        emergency_id=emergency.emergency_id,
        ambulance_id=vehicle.vehicle_id,
        trigger_source="PUSH_BUTTON",
        route=priority_res.route,
        current_priority_junction=priority_res.current_priority_junction,
        junction_priority_states=priority_res.junction_priority_states,
        message="Emergency priority green corridor active for ambulance " + vehicle.vehicle_id,
        timestamp=int(now_utc.timestamp()),
    )


@router.post("/clear", response_model=EmergencyClearResponse, status_code=status.HTTP_200_OK)
def clear_emergency(
    payload: EmergencyClearRequest = EmergencyClearRequest(),
    db: Session = Depends(get_db),
):
    """Safely clear active emergency corridor, resetting vehicle and mission state."""
    now_utc = datetime.now(timezone.utc)
    emergency_id = payload.emergency_id or "E-001"
    ambulance_id = payload.ambulance_id or "AX-01"

    # Reset Emergency in DB
    emergency = (
        db.query(Emergency)
        .filter(Emergency.emergency_id == emergency_id)
        .first()
    )
    if emergency:
        emergency.status = "COMPLETED"
        emergency.updated_at = now_utc
        db.commit()

    # Reset Vehicle in DB
    vehicle = (
        db.query(EmergencyVehicle)
        .filter(EmergencyVehicle.vehicle_id == ambulance_id)
        .first()
    )
    if vehicle:
        vehicle.emergency_status = "IDLE"
        db.commit()

    # Update hardware registry state
    _hardware_registry["is_active_push_trigger"] = False

    return EmergencyClearResponse(
        status="CLEARED",
        emergency_id=emergency_id,
        ambulance_id=ambulance_id,
        vehicle_status="IDLE",
        message=f"Emergency mission '{emergency_id}' cleared by {payload.clear_source or 'MANUAL'}",
        timestamp=int(now_utc.timestamp()),
    )


@router.get("/live-state", response_model=LiveEmergencyStateResponse, status_code=status.HTTP_200_OK)
def get_live_emergency_state(
    demo: bool = Query(False, description="Set to true if in simulated demo mode"),
    db: Session = Depends(get_db),
):
    """Retrieve operational live emergency state and hardware connectivity status.
    
    Dashboards poll this endpoint to immediately detect physical button presses
    and real hardware status.
    """
    now_utc = datetime.now(timezone.utc)
    hardware_status = _get_hardware_status(is_demo=demo)

    # Fetch vehicle AX-01
    vehicle = (
        db.query(EmergencyVehicle)
        .filter(EmergencyVehicle.vehicle_id == "AX-01")
        .first()
    )

    # Fetch emergency E-001
    emergency = (
        db.query(Emergency)
        .filter(Emergency.emergency_id == "E-001")
        .first()
    )

    is_active = bool(emergency and emergency.status == "ACTIVE")
    last_btn = _hardware_registry.get("last_button_time")
    last_ping = int(last_btn.timestamp()) if last_btn else None

    if is_active:
        try:
            priority_res = PriorityEngineService.get_emergency_priority(
                db=db,
                emergency_id=emergency.emergency_id,
                current_junction_id=emergency.current_corridor_junction_id,
            )
            route = priority_res.route
            current_priority_junction = priority_res.current_priority_junction
            junction_states = priority_res.junction_priority_states
        except Exception:
            route = ["J1", "J2", "J3", "J4"]
            current_priority_junction = "J2"
            junction_states = {
                "J1": "COMPLETED",
                "J2": "ACTIVE_PRIORITY",
                "J3": "PREPARING",
                "J4": "NORMAL",
            }

        return LiveEmergencyStateResponse(
            is_active=True,
            emergency_id=emergency.emergency_id,
            ambulance_id=vehicle.vehicle_id if vehicle else "AX-01",
            trigger_source=_hardware_registry.get("last_trigger_source") or "PUSH_BUTTON",
            trigger_timestamp=last_ping,
            route=route,
            current_priority_junction=current_priority_junction,
            junction_priority_states=junction_states,
            emergency_type=emergency.emergency_type,
            destination_hospital=emergency.destination_hospital,
            vehicle_status=vehicle.emergency_status if vehicle else "ACTIVE_CRITICAL",
            hardware_status=hardware_status,
            last_hardware_ping=last_ping,
        )

    # If inactive, return safe idle states
    return LiveEmergencyStateResponse(
        is_active=False,
        emergency_id=emergency.emergency_id if emergency else "E-001",
        ambulance_id=vehicle.vehicle_id if vehicle else "AX-01",
        trigger_source=None,
        trigger_timestamp=None,
        route=["J1", "J2", "J3", "J4"],
        current_priority_junction=None,
        junction_priority_states={
            "J1": "NORMAL",
            "J2": "NORMAL",
            "J3": "NORMAL",
            "J4": "NORMAL",
        },
        emergency_type=emergency.emergency_type if emergency else "CARDIAC_CRITICAL",
        destination_hospital=emergency.destination_hospital if emergency else "City General Emergency Center",
        vehicle_status=vehicle.emergency_status if vehicle else "IDLE",
        hardware_status=hardware_status,
        last_hardware_ping=last_ping,
    )
