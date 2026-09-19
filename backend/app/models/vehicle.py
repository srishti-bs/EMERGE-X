"""EmergencyVehicle SQLAlchemy Model.

Phase 3: Emergency & Ambulance Management.
"""

from sqlalchemy import Column, DateTime, Float, String
from backend.app.database.session import Base


class EmergencyVehicle(Base):
    """Represents an emergency vehicle (e.g. AMB-01) tracked by EMERGE-X."""

    __tablename__ = "emergency_vehicles"

    vehicle_id = Column(String, primary_key=True, index=True)
    vehicle_type = Column(String, nullable=False, default="AMBULANCE")
    rfid_tag = Column(String, nullable=True, index=True)
    status = Column(String, nullable=False, default="ACTIVE")

    # Phase 3: Location and telemetry state
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    speed = Column(Float, nullable=True, default=0.0)
    last_location_time = Column(DateTime, nullable=True)
    emergency_status = Column(String, nullable=True, default="IDLE")
