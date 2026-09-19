"""Test suite verifying Live GPS Telemetry ingestion and database persistence."""

import time
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.vehicle import EmergencyVehicle
from backend.app.models.emergency import Emergency


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_ingest_live_gps_telemetry(client):
    """Verify ESP32 live GPS telemetry ingestion via POST /api/v1/telemetry/ambulance."""
    now_ts = int(time.time())
    payload = {
        "vehicle_id": "AX-01",
        "latitude": 12.974512,
        "longitude": 77.594891,
        "speed": 52.4,
        "timestamp": now_ts,
        "emergency_status": "ACTIVE_CRITICAL",
    }

    response = client.post("/api/v1/telemetry/ambulance", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()

    assert data["status"] == "received"
    assert data["vehicle_id"] == "AX-01"
    assert abs(data["latitude"] - 12.974512) < 1e-5
    assert abs(data["longitude"] - 77.594891) < 1e-5
    assert abs(data["speed"] - 52.4) < 1e-2
    assert data["emergency_status"] == "ACTIVE_CRITICAL"

    # Verify persistence directly in database
    db = SessionLocal()
    try:
        vehicle = db.query(EmergencyVehicle).filter(EmergencyVehicle.vehicle_id == "AX-01").first()
        assert vehicle is not None
        assert abs(vehicle.current_latitude - 12.974512) < 1e-5
        assert abs(vehicle.current_longitude - 77.594891) < 1e-5
        assert abs(vehicle.speed - 52.4) < 1e-2
        assert vehicle.last_location_time is not None
    finally:
        db.close()


def test_vehicle_api_reflects_live_gps(client):
    """Verify GET /api/vehicles/AX-01 returns the live GPS telemetry stored in DB."""
    response = client.get("/api/vehicles/AX-01")
    assert response.status_code == 200
    data = response.json()
    assert data["vehicle_id"] == "AX-01"
    assert abs(data["current_latitude"] - 12.974512) < 1e-5
    assert abs(data["current_longitude"] - 77.594891) < 1e-5
    assert abs(data["speed"] - 52.4) < 1e-2


def test_emergency_priority_reflects_live_gps(client):
    """Verify GET /api/emergencies/E-001/priority returns updated current_ambulance_location."""
    response = client.get("/api/emergencies/E-001/priority")
    assert response.status_code == 200
    data = response.json()
    assert data["emergency_id"] == "E-001"
    assert data["vehicle_id"] == "AX-01"
    assert data["current_ambulance_location"] is not None
    assert abs(data["current_ambulance_location"]["latitude"] - 12.974512) < 1e-5
    assert abs(data["current_ambulance_location"]["longitude"] - 77.594891) < 1e-5
    assert abs(data["current_ambulance_location"]["speed"] - 52.4) < 1e-2


def test_telemetry_with_zero_timestamp_graceful_fallback(client):
    """Verify that a timestamp of 0 gracefully defaults to current server UTC time."""
    payload = {
        "vehicle_id": "AX-01",
        "latitude": 12.975000,
        "longitude": 77.596000,
        "speed": 45.0,
        "timestamp": 0,
        "emergency_status": "ACTIVE_CRITICAL",
    }
    response = client.post("/api/v1/telemetry/ambulance", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Timestamp returned should be recent (greater than year 2020)
    assert data["timestamp"] > 1600000000


def test_telemetry_unknown_vehicle_returns_404(client):
    """Verify that an unregistered vehicle returns a 404 error."""
    payload = {
        "vehicle_id": "UNKNOWN-99",
        "latitude": 12.9715,
        "longitude": 77.5945,
        "speed": 40.0,
        "timestamp": int(time.time()),
        "emergency_status": "ACTIVE_CRITICAL",
    }
    response = client.post("/api/v1/telemetry/ambulance", json=payload)
    assert response.status_code == 404
