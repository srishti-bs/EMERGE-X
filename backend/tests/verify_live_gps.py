"""Verification script for Live GPS Telemetry -> DB -> Priority Engine integration."""

import sys
import time
from backend.app.database.session import SessionLocal, init_db
from backend.app.models.vehicle import EmergencyVehicle
from backend.app.models.emergency import Emergency
from backend.app.api.telemetry import ingest_ambulance_telemetry, AmbulanceTelemetryPayload
from backend.app.services.priority import PriorityEngineService
from backend.app.services.routing import RoutingService


def run_verification():
    print("=" * 60)
    print("EMERGE-X LIVE GPS INTEGRATION TEST")
    print("=" * 60)

    # 1. Initialize DB
    init_db()
    db = SessionLocal()

    try:
        # Seed network & vehicle
        RoutingService.seed_demo_network(db)

        # 2. Test Telemetry Ingestion for AX-01
        print("\n[TEST 1] Ingesting Live GPS Telemetry for AX-01...")
        test_lat = 12.974820
        test_lon = 77.595130
        test_speed = 54.2
        test_ts = int(time.time())

        payload = AmbulanceTelemetryPayload(
            vehicle_id="AX-01",
            latitude=test_lat,
            longitude=test_lon,
            speed=test_speed,
            timestamp=test_ts,
            emergency_status="ACTIVE_CRITICAL",
        )

        result = ingest_ambulance_telemetry(payload, db=db)
        print("-> Ingest Result:", result)
        assert result["status"] == "received", "Status must be received"
        assert result["vehicle_id"] == "AX-01", "Vehicle must be AX-01"
        assert abs(result["latitude"] - test_lat) < 1e-5
        assert abs(result["longitude"] - test_lon) < 1e-5
        assert abs(result["speed"] - test_speed) < 1e-2
        print("[PASS] Ingestion returned expected payload")

        # 3. Test Database Persistence
        print("\n[TEST 2] Verifying Direct Database Persistence...")
        vehicle = db.query(EmergencyVehicle).filter(EmergencyVehicle.vehicle_id == "AX-01").first()
        assert vehicle is not None, "Vehicle AX-01 must exist in database"
        assert abs(vehicle.current_latitude - test_lat) < 1e-5, "Latitude must match in DB"
        assert abs(vehicle.current_longitude - test_lon) < 1e-5, "Longitude must match in DB"
        assert abs(vehicle.speed - test_speed) < 1e-2, "Speed must match in DB"
        assert vehicle.last_location_time is not None, "Timestamp must be recorded"
        print("[PASS] Database verified: coordinates, speed, and timestamp successfully updated")

        # 4. Test Priority Engine reflects live GPS
        print("\n[TEST 3] Verifying Priority Engine Reflects Live GPS Coordinates...")
        p_res = PriorityEngineService.get_emergency_priority(db=db, emergency_id="E-001")
        assert p_res.current_ambulance_location is not None, "Location must be populated"
        assert abs(p_res.current_ambulance_location.latitude - test_lat) < 1e-5
        assert abs(p_res.current_ambulance_location.longitude - test_lon) < 1e-5
        assert abs(p_res.current_ambulance_location.speed - test_speed) < 1e-2
        print("[PASS] Priority Engine returns live GPS coordinates:", p_res.current_ambulance_location)

        # 5. Test Zero-Timestamp Safe Fallback
        print("\n[TEST 4] Testing Safe Fallback for Zero Timestamp (Pre-GPS UTC Sync)...")
        payload_zero_ts = AmbulanceTelemetryPayload(
            vehicle_id="AX-01",
            latitude=12.976000,
            longitude=77.596000,
            speed=48.0,
            timestamp=0,
            emergency_status="ACTIVE_CRITICAL",
        )
        res_zero = ingest_ambulance_telemetry(payload_zero_ts, db=db)
        assert res_zero["timestamp"] > 1600000000, "Timestamp must default to recent UTC epoch"
        print("[PASS] Zero timestamp safely defaulted to current UTC epoch:", res_zero["timestamp"])

        print("\n" + "=" * 60)
        print("ALL LIVE GPS BACKEND TESTS PASSED SUCCESSFULLY! (4/4)")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    run_verification()
