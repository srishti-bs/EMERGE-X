"""Junction SQLAlchemy Model.

Phase 2: Backend Data Layer.
"""

from sqlalchemy import Column, Float, String
from backend.app.database.session import Base


class Junction(Base):
    """Represents a physical or simulated traffic intersection in EMERGE-X."""

    __tablename__ = "junctions"

    junction_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="ACTIVE")
