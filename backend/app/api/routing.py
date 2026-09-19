"""Routing API Endpoints.

Phase 4: MVP Road Network & Routing Engine.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.road import RoadSegment
from backend.app.schemas.routing import (
    RoadSegmentCreate,
    RoadSegmentResponse,
    RouteCalculateRequest,
    RouteCalculateResponse,
)
from backend.app.services.routing import RoutingService

router = APIRouter(prefix="/routing", tags=["Routing"])


@router.post("/calculate", response_model=RouteCalculateResponse)
def calculate_route(
    payload: RouteCalculateRequest,
    db: Session = Depends(get_db),
):
    """Calculate the shortest path between start and destination using Dijkstra's algorithm.
    
    Returns ordered junction sequence, total graph cost, estimated travel time,
    and upcoming corridor junctions.
    """
    return RoutingService.process_route_calculation(
        db=db,
        start_junction_id=payload.start_junction_id,
        destination_junction_id=payload.destination_junction_id,
        emergency_id=payload.emergency_id,
        vehicle_id=payload.vehicle_id,
        current_junction_id=payload.current_junction_id,
    )


@router.get("/roads", response_model=List[RoadSegmentResponse])
def get_road_segments(db: Session = Depends(get_db)):
    """Retrieve all road segments from the routing database."""
    return db.query(RoadSegment).all()


@router.post("/roads", response_model=RoadSegmentResponse, status_code=status.HTTP_201_CREATED)
def create_road_segment(
    road_in: RoadSegmentCreate,
    db: Session = Depends(get_db),
):
    """Register a new directed road segment in the network graph."""
    existing = db.query(RoadSegment).filter(RoadSegment.road_id == road_in.road_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Road segment with ID '{road_in.road_id}' already exists.",
        )
    road = RoadSegment(**road_in.model_dump())
    db.add(road)
    db.commit()
    db.refresh(road)
    return road


@router.post("/seed-demo")
def seed_demo_road_network(db: Session = Depends(get_db)):
    """Seed demo junctions (J1-J5, J_DISCONNECTED) and road segments for testing."""
    result = RoutingService.seed_demo_network(db)
    return {
        "status": "success",
        "note": "PROTOTYPE DEMO ROAD NETWORK ONLY",
        **result,
    }


@router.get("/demo-network")
def get_demo_network(db: Session = Depends(get_db)):
    """Inspect current demo network topology with demo labels."""
    roads = db.query(RoadSegment).all()
    return {
        "note": "PROTOTYPE DEMO ROAD NETWORK ONLY",
        "total_roads": len(roads),
        "roads": [
            {
                "road_id": r.road_id,
                "source": r.source_junction_id,
                "target": r.target_junction_id,
                "cost": r.cost,
                "time_sec": r.base_travel_time_seconds,
                "status": r.status,
            }
            for r in roads
        ],
    }
