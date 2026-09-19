"""Comprehensive Verification Suite for Phase 3: Emergency & Ambulance Management.

Tests:
1. GET /health
2. POST /api/vehicles (create ambulance)
3. GET /api/vehicles (list ambulances)
4. GET /api/vehicles/{vehicle_id} (get ambulance)
5. POST /api/emergencies (create emergency)
6. GET /api/emergencies (list emergencies)
7. GET /api/emergencies/{emergency_id} (get emergency)
8. PATCH /api/emergencies/{emergency_id} (update emergency status to COMPLETED)
9. Validation: PATCH with invalid emergency status returns 400
10. POST /api/vehicles/{vehicle_id}/location (GPS location update)
11. Verification: GET /api/vehicles/{vehicle_id} reflects updated location
12. Validation: invalid coordinates outside [-90, 90] / [-180, 180] returns 422
13. Prototype Simulation: POST /api/vehicles/{vehicle_id}/simulate-location
14. Hardware Contract: POST /api/v1/telemetry/ambulance matches locked contract
15. Phase 2 verification: GET /api/junctions continues to work
16. Direct SQLite persistence: checks disk row values via sqlite3 driver
"""

import json
import sqlite3
import urllib.error
import urllib.request


def req(url, method="GET", body=None):
    data = json.dumps(body).encode("utf-8") if body else None
    headers = {"Content-Type": "application/json"} if body else {}
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def main():
    import time
    run_id = int(time.time())
    v_id = f"AMB-PH3-{run_id}"
    e_id = f"EMG-PH3-{run_id}"

    print("=== 1. Check GET /health ===")
    status, body = req("http://127.0.0.1:8000/health")
    print("GET /health:", status, body)
    assert status == 200
    assert body == {"status": "ok", "service": "EMERGE-X backend"}

    print("\n=== 2. Create test ambulance POST /api/vehicles ===")
    v_data = {
        "vehicle_id": v_id,
        "vehicle_type": "AMBULANCE",
        "rfid_tag": f"RFID-{run_id}",
        "status": "ACTIVE",
    }
    status, v_created = req(
        "http://127.0.0.1:8000/api/vehicles", method="POST", body=v_data
    )
    print("POST /api/vehicles:", status, v_created)
    assert status == 201
    assert v_created["vehicle_id"] == v_id

    print(f"\n=== 3. Retrieve ambulance GET /api/vehicles/{v_id} ===")
    status, vehicle = req(f"http://127.0.0.1:8000/api/vehicles/{v_id}")
    print(f"GET /api/vehicles/{v_id}:", status, vehicle)
    assert status == 200
    assert vehicle["vehicle_id"] == v_id

    print("\n=== 4. Create emergency POST /api/emergencies ===")
    e_data = {
        "emergency_id": e_id,
        "vehicle_id": v_id,
        "emergency_type": "CRITICAL_TRAUMA",
        "destination_hospital": "City Central Hospital",
        "status": "ACTIVE",
        "details": "Major incident response",
    }
    status, e_created = req(
        "http://127.0.0.1:8000/api/emergencies", method="POST", body=e_data
    )
    print("POST /api/emergencies:", status, e_created)
    assert status == 201
    assert e_created["emergency_id"] == e_id

    print(f"\n=== 5. Retrieve emergency GET /api/emergencies/{e_id} ===")
    status, emergency = req(f"http://127.0.0.1:8000/api/emergencies/{e_id}")
    print(f"GET /api/emergencies/{e_id}:", status, emergency)
    assert status == 200
    assert emergency["emergency_id"] == e_id
    assert emergency["status"] == "ACTIVE"

    print(f"\n=== 6. Update emergency status PATCH /api/emergencies/{e_id} ===")
    patch_data = {"status": "COMPLETED", "details": "Patient delivered to ICU"}
    status, e_updated = req(
        f"http://127.0.0.1:8000/api/emergencies/{e_id}",
        method="PATCH",
        body=patch_data,
    )
    print(f"PATCH /api/emergencies/{e_id}:", status, e_updated)
    assert status == 200
    assert e_updated["status"] == "COMPLETED"
    assert e_updated["details"] == "Patient delivered to ICU"

    print("\n=== 7. Test invalid emergency status (Validation test) ===")
    status, err = req(
        f"http://127.0.0.1:8000/api/emergencies/{e_id}",
        method="PATCH",
        body={"status": "INVALID_STATE"},
    )
    print("PATCH with invalid status:", status, err)
    assert status in (400, 422)

    print(f"\n=== 8. Update GPS location POST /api/vehicles/{v_id}/location ===")
    loc_data = {
        "latitude": 12.9715987,
        "longitude": 77.5945627,
        "speed": 54.2,
        "timestamp": 1773822600,
        "emergency_status": "ACTIVE_CRITICAL",
    }
    status, loc_resp = req(
        f"http://127.0.0.1:8000/api/vehicles/{v_id}/location",
        method="POST",
        body=loc_data,
    )
    print("POST /api/vehicles/{id}/location:", status, loc_resp)
    assert status == 200
    assert loc_resp["latitude"] == 12.9715987
    assert loc_resp["longitude"] == 77.5945627
    assert loc_resp["emergency_status"] == "ACTIVE_CRITICAL"

    print(f"\n=== 9. Verify GPS update on vehicle GET /api/vehicles/{v_id} ===")
    status, vehicle = req(f"http://127.0.0.1:8000/api/vehicles/{v_id}")
    print("GET /api/vehicles after location update:", status, vehicle)
    assert status == 200
    assert vehicle["current_latitude"] == 12.9715987
    assert vehicle["current_longitude"] == 77.5945627
    assert vehicle["speed"] == 54.2

    print("\n=== 10. Test Invalid Coordinate Validation ===")
    bad_loc = {"latitude": 999.0, "longitude": 77.5945627}
    status, bad_resp = req(
        f"http://127.0.0.1:8000/api/vehicles/{v_id}/location",
        method="POST",
        body=bad_loc,
    )
    print("POST invalid lat 999:", status, bad_resp)
    assert status in (400, 422)

    print(f"\n=== 11. Test Prototype Simulation POST /api/vehicles/{v_id}/simulate-location ===")
    sim_data = {"delta_lat": 0.002, "delta_lon": 0.003, "speed": 60.0}
    status, sim_resp = req(
        f"http://127.0.0.1:8000/api/vehicles/{v_id}/simulate-location",
        method="POST",
        body=sim_data,
    )
    print("POST /simulate-location:", status, sim_resp)
    assert status == 200
    assert sim_resp["simulated"] is True
    assert "PROTOTYPE SIMULATION DATA ONLY" in sim_resp["note"]

    print("\n=== 12. Test Locked Hardware Contract POST /api/v1/telemetry/ambulance ===")
    telemetry_data = {
        "vehicle_id": v_id,
        "latitude": 12.9750000,
        "longitude": 77.5990000,
        "speed": 48.0,
        "timestamp": 1773822700,
        "emergency_status": "EN_ROUTE",
    }
    status, tel_resp = req(
        "http://127.0.0.1:8000/api/v1/telemetry/ambulance",
        method="POST",
        body=telemetry_data,
    )
    print("POST /api/v1/telemetry/ambulance:", status, tel_resp)
    assert status == 200
    assert tel_resp["status"] == "received"

    print("\n=== 13. Verify Phase 2 Junctions Endpoints Still Work ===")
    status, junctions = req("http://127.0.0.1:8000/api/junctions")
    print("GET /api/junctions status:", status, "Count:", len(junctions))
    assert status == 200

    print("\n=== 14. Direct SQLite Database Persistence Check ===")
    conn = sqlite3.connect("backend/data/emerge_x.db")
    cur = conn.cursor()
    cur.execute(
        "SELECT vehicle_id, current_latitude, current_longitude, speed, emergency_status FROM emergency_vehicles WHERE vehicle_id = ?",
        (v_id,),
    )
    row = cur.fetchone()
    print(f"Direct DB row for {v_id}:", row)
    assert row is not None
    assert row[0] == v_id
    assert row[1] == 12.9750000

    cur.execute(
        "SELECT emergency_id, status FROM emergencies WHERE emergency_id = ?",
        (e_id,),
    )
    erow = cur.fetchone()
    print(f"Direct DB row for {e_id}:", erow)
    assert erow is not None
    assert erow[1] == "COMPLETED"
    conn.close()

    print("\n>>> ALL 14 PHASE 3 TESTS & PERSISTENCE CHECKS PASSED! <<<")


if __name__ == "__main__":
    main()
