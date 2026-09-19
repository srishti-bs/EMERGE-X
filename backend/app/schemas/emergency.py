"""Emergency Pydantic Schemas.

Phase 3: Emergency & Ambulance Management.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

VALID_EMERGENCY_STATUSES = {"ACTIVE", "COMPLETED", "CANCELLED"}


class EmergencyBase(BaseModel):
    emergency_id: str = Field(..., description="Unique emergency identifier")
    vehicle_id: Optional[str] = Field(
        default=None, description="Assigned ambulance identifier"
    )
    emergency_type: str = Field(..., description="Emergency classification/type")
    details: Optional[str] = Field(
        default=None, description="Incident clinical details/triage notes"
    )
    destination_hospital: str = Field(
        ..., description="Designated receiving hospital"
    )
    status: str = Field(
        default="ACTIVE", description="Current status (ACTIVE, COMPLETED, CANCELLED)"
    )

    @field_validator("emergency_id")
    @classmethod
    def validate_emergency_id(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("emergency_id cannot be empty")
        return v_stripped

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_upper = v.upper()
        if v_upper not in VALID_EMERGENCY_STATUSES:
            raise ValueError(
                f"Invalid status '{v}'. Allowed statuses are: {', '.join(sorted(VALID_EMERGENCY_STATUSES))}"
            )
        return v_upper


class EmergencyCreate(EmergencyBase):
    pass


class EmergencyUpdate(BaseModel):
    vehicle_id: Optional[str] = None
    emergency_type: Optional[str] = None
    details: Optional[str] = None
    destination_hospital: Optional[str] = None
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v_upper = v.upper()
        if v_upper not in VALID_EMERGENCY_STATUSES:
            raise ValueError(
                f"Invalid status '{v}'. Allowed statuses are: {', '.join(sorted(VALID_EMERGENCY_STATUSES))}"
            )
        return v_upper


class EmergencyResponse(EmergencyBase):
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
