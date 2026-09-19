"""RoadSegment SQLAlchemy Model.

Phase 4: MVP Road Network & Routing Engine.
"""

from sqlalchemy import Column, Float, ForeignKey, String
from backend.app.database.session import Base


class RoadSegment(Base):
    """Represents a directed road edge connecting two traffic junctions in the routing graph."""

    __tablename__ = "road_segments"

    road_id = Column(String, primary_key=True, index=True)
    source_junction_id = Column(
        String,
        ForeignKey("junctions.junction_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_junction_id = Column(
        String,
        ForeignKey("junctions.junction_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    distance_meters = Column(Float, nullable=False, default=500.0)
    base_travel_time_seconds = Column(Float, nullable=False, default=30.0)
    cost = Column(Float, nullable=False, default=10.0)
    status = Column(String, nullable=False, default="OPEN")
