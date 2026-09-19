"""Pydantic schemas for Live Emergency Trigger, Clear, and Live State.

EMERGE-X Live Emergency Core (Push Button ESP32 -> FastAPI -> Priority Engine).
"""

from datetime import datetime
from typing import Dict, List, Optional, Union
from pydantic import BaseModel, Field


class EmergencyTriggerRequest(BaseModel):
    """Payload sent by ESP32 physical push-button emergency trigger."""

    ambulance_id: str = Field(
        default="AX-01",
        description="Identifier of the ambulance triggering the emergency",
    )
    trigger_source: str = Field(
        default="PUSH_BUTTON",
        description="Source of emergency trigger. Must be 'PUSH_BUTTON'.",
    )
    timestamp: Optional[Union[int, float, datetime]] = Field(
        default=0,
        description="Unix timestamp or 0 to use backend server reception time",
    )
    emergency_type: Optional[str] = Field(
        default="CARDIAC_CRITICAL",
        description="Type/classification of medical emergency",
    )
    destination_junction_id: Optional[str] = Field(
        default="J4",
        description="Target destination junction on road network",
    )


class EmergencyTriggerResponse(BaseModel):
    """Response returned upon accepting physical emergency trigger."""

    status: str = Field(..., description="'ACTIVATED' or 'ACTIVE_MAINTAINED'")
    emergency_id: str
    ambulance_id: str
    trigger_source: str
    route: List[str]
    current_priority_junction: str
    junction_priority_states: Dict[str, str]
    message: str
    timestamp: int


class EmergencyClearRequest(BaseModel):
    """Request payload to clear active emergency state."""

    emergency_id: Optional[str] = Field(
        default="E-001",
        description="Emergency incident ID to clear",
    )
    ambulance_id: Optional[str] = Field(
        default="AX-01",
        description="Associated ambulance ID",
    )
    clear_source: Optional[str] = Field(
        default="MANUAL",
        description="Source that requested clear (e.g. 'MANUAL', 'COMMANDER', 'PUSH_BUTTON')",
    )


class EmergencyClearResponse(BaseModel):
    """Response returned upon clearing emergency."""

    status: str = Field(..., description="'CLEARED'")
    emergency_id: str
    ambulance_id: str
    vehicle_status: str
    message: str
    timestamp: int


class LiveEmergencyStateResponse(BaseModel):
    """Operational live state consumed by React Commander, Driver, and Hospital dashboards."""

    is_active: bool
    emergency_id: Optional[str] = None
    ambulance_id: Optional[str] = None
    trigger_source: Optional[str] = None
    trigger_timestamp: Optional[int] = None
    route: List[str] = []
    current_priority_junction: Optional[str] = None
    junction_priority_states: Dict[str, str] = {}
    emergency_type: Optional[str] = None
    destination_hospital: Optional[str] = None
    vehicle_status: Optional[str] = None
    hardware_status: str  # "LIVE HARDWARE" | "DEMO" | "OFFLINE" | "PENDING"
    last_hardware_ping: Optional[int] = None
