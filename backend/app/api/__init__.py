"""API Layer Package.

Phase 4: MVP Road Network & Routing Engine.
"""

from fastapi import APIRouter
from backend.app.api.emergencies import router as emergencies_router
from backend.app.api.junctions import router as junctions_router
from backend.app.api.routing import router as routing_router
from backend.app.api.emergency_trigger import router as emergency_trigger_router
from backend.app.api.telemetry import router as telemetry_router
from backend.app.api.vehicles import router as vehicles_router

# Phase 2, 3 & 4 prototype endpoints: /api/vehicles, /api/junctions, /api/emergencies, /api/routing
api_router = APIRouter(prefix="/api")
api_router.include_router(vehicles_router)
api_router.include_router(junctions_router)
api_router.include_router(emergencies_router)
api_router.include_router(routing_router)

# Locked hardware integration endpoints: /api/v1/telemetry/ambulance, /api/v1/emergency/*
api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(telemetry_router)
api_v1_router.include_router(emergency_trigger_router)

__all__ = ["api_router", "api_v1_router"]
