"""Emergency Priority Engine Service.

Phase 5: MVP Emergency Priority & Moving Green Corridor.
"""

import json
import math
from typing import Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.emergency import Emergency
from backend.app.models.junction import Junction
from backend.app.models.vehicle import EmergencyVehicle
from backend.app.schemas.priority import (
    AmbulanceLocationInfo,
    EmergencyPriorityResponse,
    JunctionCommandItem,
    JunctionStateItem,
)
from backend.app.services.routing import RoutingService


class PriorityState:
    NORMAL = "NORMAL"
    PREPARING = "PREPARING"
    ACTIVE_PRIORITY = "ACTIVE_PRIORITY"
    COMPLETED = "COMPLETED"


class PriorityEngineService:
    """Computes moving green corridor priority across route junctions."""

    @staticmethod
    def resolve_corridor_states(
        route: List[str],
        active_junction_id: str,
    ) -> Tuple[Dict[str, str], List[JunctionStateItem]]:
        """Compute state for each junction along the route based on active junction progress.
        
        Rules:
        - Past junctions (index < active_index): COMPLETED
        - Target approaching junction (index == active_index): ACTIVE_PRIORITY
        - Next immediate junction (index == active_index + 1): PREPARING
        - Subsequent future junctions (index > active_index + 1): NORMAL
        """
        if not route:
            return {}, []

        try:
            active_idx = route.index(active_junction_id)
        except ValueError:
            # If active_junction_id not in route, default to approaching second node
            active_idx = 1 if len(route) > 1 else 0

        states_dict: Dict[str, str] = {}
        states_list: List[JunctionStateItem] = []

        for idx, j_id in enumerate(route):
            if idx < active_idx:
                st = PriorityState.COMPLETED
            elif idx == active_idx:
                st = PriorityState.ACTIVE_PRIORITY
            elif idx == active_idx + 1:
                st = PriorityState.PREPARING
            else:
                st = PriorityState.NORMAL

            states_dict[j_id] = st
            states_list.append(JunctionStateItem(junction_id=j_id, state=st))

        return states_dict, states_list

    @staticmethod
    def find_nearest_route_junction(
        db: Session,
        route: List[str],
        lat: float,
        lon: float,
    ) -> str:
        """Find the junction on the route physically closest to given GPS coordinates."""
        junctions = (
            db.query(Junction)
            .filter(Junction.junction_id.in_(route))
            .all()
        )
        if not junctions:
            return route[1] if len(route) > 1 else route[0]

        best_junc = route[1] if len(route) > 1 else route[0]
        min_dist = float("inf")

        for j in junctions:
            # Simple Euclidean approximation for local hackathon grid
            dist = math.sqrt((j.latitude - lat) ** 2 + (j.longitude - lon) ** 2)
            if dist < min_dist:
                min_dist = dist
                best_junc = j.junction_id

        return best_junc

    @classmethod
    def get_emergency_priority(
        cls,
        db: Session,
        emergency_id: str,
        current_junction_id: Optional[str] = None,
    ) -> EmergencyPriorityResponse:
        """Determine full moving priority corridor for an emergency mission."""
        emergency = (
            db.query(Emergency)
            .filter(Emergency.emergency_id == emergency_id)
            .first()
        )
        if not emergency:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Emergency with ID '{emergency_id}' not found.",
            )

        # 1. Resolve planned route
        route: List[str] = []
        if emergency.current_route:
            try:
                route = json.loads(emergency.current_route)
            except Exception:
                route = []

        # If no route is saved yet, calculate route or fallback to demo corridor
        if not route:
            # Try calculating route from J1 to destination or J4
            dest = emergency.destination_junction_id or "J4"
            start = "J1"
            try:
                res = RoutingService.process_route_calculation(
                    db=db,
                    start_junction_id=start,
                    destination_junction_id=dest,
                    emergency_id=emergency.emergency_id,
                    vehicle_id=emergency.vehicle_id,
                )
                route = res["route"]
            except Exception:
                route = ["J1", "J2", "J3", "J4"]

        # 2. Resolve vehicle and current location
        vehicle = None
        loc_info = None
        if emergency.vehicle_id:
            vehicle = (
                db.query(EmergencyVehicle)
                .filter(EmergencyVehicle.vehicle_id == emergency.vehicle_id)
                .first()
            )
            if vehicle and vehicle.current_latitude is not None and vehicle.current_longitude is not None:
                loc_info = AmbulanceLocationInfo(
                    latitude=vehicle.current_latitude,
                    longitude=vehicle.current_longitude,
                    speed=vehicle.speed or 0.0,
                    timestamp=int(vehicle.last_location_time.timestamp()) if vehicle.last_location_time else None,
                    emergency_status=vehicle.emergency_status,
                )

        # 3. Determine active priority junction
        if current_junction_id and current_junction_id in route:
            active_junction = current_junction_id
        elif emergency.current_corridor_junction_id and emergency.current_corridor_junction_id in route:
            active_junction = emergency.current_corridor_junction_id
        elif loc_info:
            active_junction = cls.find_nearest_route_junction(
                db, route, loc_info.latitude, loc_info.longitude
            )
        else:
            # Default to approaching J2 (the first corridor intersection on J1 -> J2 -> ...)
            active_junction = route[1] if len(route) > 1 else route[0]

        # Update and persist current active corridor position
        emergency.current_corridor_junction_id = active_junction
        db.commit()

        # 4. Resolve states for corridor
        states_dict, states_list = cls.resolve_corridor_states(route, active_junction)

        # 5. Build internal command representation for downstream junction controllers (Phase 6)
        junction_commands: List[JunctionCommandItem] = [
            JunctionCommandItem(
                junction_id=j_id,
                state=st,
                timing={
                    "yellow_transition_sec": 3,
                    "all_red_clearance_sec": 2,
                    "green_corridor_sec": 30,
                    "max_hold_sec": 45,
                },
                vehicle_id=emergency.vehicle_id,
                trip_id=emergency.emergency_id,
            )
            for j_id, st in states_dict.items()
        ]

        return EmergencyPriorityResponse(
            emergency_id=emergency.emergency_id,
            vehicle_id=emergency.vehicle_id,
            route=route,
            current_priority_junction=active_junction,
            junction_priority_states=states_dict,
            junction_states_list=states_list,
            current_ambulance_location=loc_info,
            junction_commands=junction_commands,
        )

    @classmethod
    def step_corridor_progress(
        cls,
        db: Session,
        emergency_id: str,
        target_junction_id: Optional[str] = None,
    ) -> EmergencyPriorityResponse:
        """Step the ambulance forward to the next junction along the route."""
        emergency = (
            db.query(Emergency)
            .filter(Emergency.emergency_id == emergency_id)
            .first()
        )
        if not emergency:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Emergency with ID '{emergency_id}' not found.",
            )

        route = []
        if emergency.current_route:
            try:
                route = json.loads(emergency.current_route)
            except Exception:
                route = []
        if not route:
            route = ["J1", "J2", "J3", "J4"]

        if target_junction_id and target_junction_id in route:
            next_junc = target_junction_id
        else:
            curr = emergency.current_corridor_junction_id or (route[1] if len(route) > 1 else route[0])
            if curr in route:
                curr_idx = route.index(curr)
                next_idx = min(curr_idx + 1, len(route) - 1)
                next_junc = route[next_idx]
            else:
                next_junc = route[0]

        emergency.current_corridor_junction_id = next_junc
        db.commit()

        return cls.get_emergency_priority(db, emergency_id, current_junction_id=next_junc)
