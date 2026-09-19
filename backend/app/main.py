"""EMERGE-X FastAPI Application Entrypoint.

AI-Powered Real-Time Emergency Mobility & Traffic Coordination System
Tagline: "Clearing the way. Saving critical minutes."

PHASE 4: MVP Road Network & Routing Engine
"""

from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import api_router, api_v1_router
from backend.app.config import settings
from backend.app.database import SessionLocal, init_db
from backend.app.services.routing import RoutingService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager to initialize DB and seed demo road graph on startup."""
    init_db()
    # Seed demo network for hackathon prototype testing
    db = SessionLocal()
    try:
        RoutingService.seed_demo_network(db)

        # Ensure vehicle AX-01 and emergency E-001 are initialized for live GPS telemetry
        import json
        from backend.app.models.vehicle import EmergencyVehicle
        from backend.app.models.emergency import Emergency

        v = db.query(EmergencyVehicle).filter(EmergencyVehicle.vehicle_id == "AX-01").first()
        if not v:
            v = EmergencyVehicle(
                vehicle_id="AX-01",
                vehicle_type="AMBULANCE",
                license_plate="KA-01-EM-9999",
                rfid_tag="E280689420000001",
                current_latitude=12.9740,
                current_longitude=77.5940,
                speed=50.0,
                emergency_status="ACTIVE_CRITICAL",
            )
            db.add(v)
            db.commit()

        e = db.query(Emergency).filter(Emergency.emergency_id == "E-001").first()
        if not e:
            e = Emergency(
                emergency_id="E-001",
                vehicle_id="AX-01",
                start_junction_id="J1",
                destination_junction_id="J4",
                current_corridor_junction_id="J2",
                current_route=json.dumps(["J1", "J2", "J3", "J4"]),
                status="ACTIVE",
            )
            db.add(e)
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=f"{settings.PROJECT_NAME}: {settings.PROJECT_TAGLINE}",
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(api_router)
app.include_router(api_v1_router)


@app.get("/health", tags=["System"])
async def health_check():
    """System health check endpoint."""
    return {
        "status": "ok",
        "service": "EMERGE-X backend",
    }


# Mount built React frontend if present (supports single-service & Docker deployments)
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.join(settings.BASE_DIR, "frontend", "dist")
if os.path.isdir(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return {"message": "EMERGE-X API Online. Frontend build not found."}


if __name__ == "__main__":
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
