"""Junctions API Endpoints.

Phase 2: Backend Data Layer.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.junction import Junction
from backend.app.schemas.junction import JunctionCreate, JunctionResponse

router = APIRouter(prefix="/junctions", tags=["Junctions"])


@router.get("", response_model=List[JunctionResponse])
def get_junctions(db: Session = Depends(get_db)):
    """Retrieve all traffic junctions from database."""
    return db.query(Junction).all()


@router.post("", response_model=JunctionResponse, status_code=status.HTTP_201_CREATED)
def create_junction(junction_in: JunctionCreate, db: Session = Depends(get_db)):
    """Register a new traffic junction in database."""
    existing = (
        db.query(Junction)
        .filter(Junction.junction_id == junction_in.junction_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Junction with ID '{junction_in.junction_id}' already exists.",
        )
    junction = Junction(**junction_in.model_dump())
    db.add(junction)
    db.commit()
    db.refresh(junction)
    return junction
