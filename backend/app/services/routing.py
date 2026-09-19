"""Routing Engine Service implementing Dijkstra's algorithm.

Phase 4: MVP Road Network & Routing Engine.
"""

import heapq
import json
from typing import Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.emergency import Emergency
from backend.app.models.junction import Junction
from backend.app.models.road import RoadSegment
from backend.app.models.vehicle import EmergencyVehicle


class RoutingService:
    """Dijkstra-based routing service for the EMERGE-X road graph."""

    @staticmethod
    def seed_demo_network(db: Session) -> Dict[str, int]:
        """Seed a small deterministic demo network (J1 -> J2 -> J3 -> J4 and alternative bypass via J5)."""
        demo_junctions = [
            {"junction_id": "J1", "name": "Junction 1 - Origin Hub", "latitude": 12.9710, "longitude": 77.5930, "status": "ACTIVE"},
            {"junction_id": "J2", "name": "Junction 2 - North Crossing", "latitude": 12.9740, "longitude": 77.5950, "status": "ACTIVE"},
            {"junction_id": "J3", "name": "Junction 3 - Boulevard Way", "latitude": 12.9770, "longitude": 77.5970, "status": "ACTIVE"},
            {"junction_id": "J4", "name": "Junction 4 - Hospital Approach", "latitude": 12.9800, "longitude": 77.6000, "status": "ACTIVE"},
            {"junction_id": "J5", "name": "Junction 5 - Express Bypass", "latitude": 12.9750, "longitude": 77.6050, "status": "ACTIVE"},
            {"junction_id": "J_DISCONNECTED", "name": "Junction Isolated", "latitude": 12.9900, "longitude": 77.6100, "status": "ACTIVE"},
        ]

        junctions_added = 0
        for j_data in demo_junctions:
            existing = db.query(Junction).filter(Junction.junction_id == j_data["junction_id"]).first()
            if not existing:
                db.add(Junction(**j_data))
                junctions_added += 1

        db.commit()

        # Seed road segments
        demo_roads = [
            # Primary Corridor: J1 -> J2 -> J3 -> J4 (Cost: 10 + 15 + 12 = 37)
            {"road_id": "ROAD-J1-J2", "source_junction_id": "J1", "target_junction_id": "J2", "distance_meters": 500.0, "base_travel_time_seconds": 30.0, "cost": 10.0, "status": "OPEN"},
            {"road_id": "ROAD-J2-J3", "source_junction_id": "J2", "target_junction_id": "J3", "distance_meters": 750.0, "base_travel_time_seconds": 45.0, "cost": 15.0, "status": "OPEN"},
            {"road_id": "ROAD-J3-J4", "source_junction_id": "J3", "target_junction_id": "J4", "distance_meters": 600.0, "base_travel_time_seconds": 36.0, "cost": 12.0, "status": "OPEN"},
            # Return/reverse edges for bidirectional traversal
            {"road_id": "ROAD-J2-J1", "source_junction_id": "J2", "target_junction_id": "J1", "distance_meters": 500.0, "base_travel_time_seconds": 30.0, "cost": 10.0, "status": "OPEN"},
            {"road_id": "ROAD-J3-J2", "source_junction_id": "J3", "target_junction_id": "J2", "distance_meters": 750.0, "base_travel_time_seconds": 45.0, "cost": 15.0, "status": "OPEN"},
            {"road_id": "ROAD-J4-J3", "source_junction_id": "J4", "target_junction_id": "J3", "distance_meters": 600.0, "base_travel_time_seconds": 36.0, "cost": 12.0, "status": "OPEN"},
            # Alternative Route via J5: J1 -> J5 -> J4 (Cost: 25 + 10 = 35) or J2 -> J5 -> J4 (Cost: 8 + 10 = 18)
            {"road_id": "ROAD-J1-J5", "source_junction_id": "J1", "target_junction_id": "J5", "distance_meters": 1000.0, "base_travel_time_seconds": 50.0, "cost": 25.0, "status": "OPEN"},
            {"road_id": "ROAD-J5-J4", "source_junction_id": "J5", "target_junction_id": "J4", "distance_meters": 500.0, "base_travel_time_seconds": 25.0, "cost": 10.0, "status": "OPEN"},
            {"road_id": "ROAD-J2-J5", "source_junction_id": "J2", "target_junction_id": "J5", "distance_meters": 400.0, "base_travel_time_seconds": 20.0, "cost": 8.0, "status": "OPEN"},
            # Return edges for bypass
            {"road_id": "ROAD-J5-J1", "source_junction_id": "J5", "target_junction_id": "J1", "distance_meters": 1000.0, "base_travel_time_seconds": 50.0, "cost": 25.0, "status": "OPEN"},
            {"road_id": "ROAD-J4-J5", "source_junction_id": "J4", "target_junction_id": "J5", "distance_meters": 500.0, "base_travel_time_seconds": 25.0, "cost": 10.0, "status": "OPEN"},
            {"road_id": "ROAD-J5-J2", "source_junction_id": "J5", "target_junction_id": "J2", "distance_meters": 400.0, "base_travel_time_seconds": 20.0, "cost": 8.0, "status": "OPEN"},
        ]

        roads_added = 0
        for r_data in demo_roads:
            existing = db.query(RoadSegment).filter(RoadSegment.road_id == r_data["road_id"]).first()
            if not existing:
                db.add(RoadSegment(**r_data))
                roads_added += 1

        db.commit()

        return {"junctions_seeded": junctions_added, "roads_seeded": roads_added}

    @staticmethod
    def calculate_dijkstra_route(
        db: Session,
        start_id: str,
        dest_id: str,
    ) -> Tuple[List[str], float, float]:
        """Compute the shortest path between start_id and dest_id using Dijkstra's algorithm."""
        # 1. Verify existence of start and destination junctions
        start_junc = db.query(Junction).filter(Junction.junction_id == start_id).first()
        if not start_junc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Start junction '{start_id}' does not exist in the database.",
            )

        dest_junc = db.query(Junction).filter(Junction.junction_id == dest_id).first()
        if not dest_junc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Destination junction '{dest_id}' does not exist in the database.",
            )

        if start_id == dest_id:
            return [start_id], 0.0, 0.0

        # 2. Build graph adjacency list from OPEN road segments
        roads = db.query(RoadSegment).filter(RoadSegment.status == "OPEN").all()
        graph: Dict[str, List[Tuple[str, float, float]]] = {}
        for r in roads:
            if r.source_junction_id not in graph:
                graph[r.source_junction_id] = []
            graph[r.source_junction_id].append((r.target_junction_id, r.cost, r.base_travel_time_seconds))

        if start_id not in graph:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No outgoing road segments found for start junction '{start_id}'.",
            )

        # 3. Dijkstra priority queue: (cost, travel_time, current_node, path)
        pq = [(0.0, 0.0, start_id, [start_id])]
        min_costs: Dict[str, float] = {start_id: 0.0}

        while pq:
            current_cost, current_time, node, path = heapq.heappop(pq)

            if node == dest_id:
                return path, current_cost, current_time

            if current_cost > min_costs.get(node, float("inf")):
                continue

            for neighbor, edge_cost, edge_time in graph.get(node, []):
                new_cost = current_cost + edge_cost
                new_time = current_time + edge_time

                if new_cost < min_costs.get(neighbor, float("inf")):
                    min_costs[neighbor] = new_cost
                    heapq.heappush(pq, (new_cost, new_time, neighbor, path + [neighbor]))

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No viable path found between start junction '{start_id}' and destination '{dest_id}'.",
        )

    @staticmethod
    def get_upcoming_junctions(route: List[str], current_position_id: Optional[str] = None) -> List[str]:
        """Determine upcoming junctions on calculated route."""
        if not route:
            return []
        if not current_position_id:
            # If no current position specified, upcoming junctions are all nodes after the origin
            return route[1:] if len(route) > 1 else route

        if current_position_id in route:
            idx = route.index(current_position_id)
            return route[idx + 1 :]
        return route[1:]

    @classmethod
    def process_route_calculation(
        cls,
        db: Session,
        start_junction_id: str,
        destination_junction_id: str,
        emergency_id: Optional[str] = None,
        vehicle_id: Optional[str] = None,
        current_junction_id: Optional[str] = None,
    ) -> Dict:
        """Calculate route, resolve junction details, update emergency, and return full response."""
        route_path, total_cost, total_time = cls.calculate_dijkstra_route(
            db, start_junction_id, destination_junction_id
        )

        # Resolve full junction objects in sequence order
        junction_map = {
            j.junction_id: j
            for j in db.query(Junction).filter(Junction.junction_id.in_(route_path)).all()
        }
        junction_sequence = [junction_map[j_id] for j_id in route_path if j_id in junction_map]

        # Determine upcoming junctions
        upcoming = cls.get_upcoming_junctions(route_path, current_junction_id)

        # Update active emergency record if provided
        if emergency_id:
            emergency = db.query(Emergency).filter(Emergency.emergency_id == emergency_id).first()
            if emergency:
                emergency.current_route = json.dumps(route_path)
                emergency.destination_junction_id = destination_junction_id
                db.commit()

        return {
            "route": route_path,
            "junction_sequence": junction_sequence,
            "total_cost": round(total_cost, 2),
            "estimated_travel_time_seconds": round(total_time, 2),
            "upcoming_junctions": upcoming,
            "emergency_id": emergency_id,
            "vehicle_id": vehicle_id,
        }
