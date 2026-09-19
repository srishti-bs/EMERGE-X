"""Junction Pydantic Schemas.

Phase 2: Backend Data Layer.
"""

from pydantic import BaseModel, ConfigDict


class JunctionBase(BaseModel):
    junction_id: str
    name: str
    latitude: float
    longitude: float
    status: str = "ACTIVE"


class JunctionCreate(JunctionBase):
    pass


class JunctionResponse(JunctionBase):
    model_config = ConfigDict(from_attributes=True)
