"""Emergency SQLAlchemy Model.

Phase 5: MVP Emergency Priority & Moving Green Corridor.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from backend.app.database.session import Base


class Emergency(Base):
    """Represents an emergency incident/mission in EMERGE-X."""

    __tablename__ = "emergencies"

    emergency_id = Column(String, primary_key=True, index=True)
    vehicle_id = Column(
        String,
        ForeignKey("emergency_vehicles.vehicle_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    emergency_type = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    destination_hospital = Column(String, nullable=False)
    status = Column(String, nullable=False, default="ACTIVE")
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Phase 4: Route integration
    current_route = Column(Text, nullable=True)  # JSON-serialized list of junction IDs
    destination_junction_id = Column(String, nullable=True)

    # Phase 5: Moving priority corridor tracking
    current_corridor_junction_id = Column(String, nullable=True)
