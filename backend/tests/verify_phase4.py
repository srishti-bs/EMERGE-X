"""Comprehensive Verification Suite for Phase 4: MVP Road Network & Routing Engine.

Tests:
1. GET /health
2. Demo network seeding (J1, J2, J3, J4, J5, J_DISCONNECTED)
3. Calculate route J1 -> J4 via Dijkstra
4. Verify ordered junction sequence and upcoming junctions
5. Verify alternative route selection when costs change
6. Error handling: Disconnected junction (J1 -> J_DISCONNECTED) returns 404
7. Error handling: Nonexistent junction returns 404
8. Emergency integration: Route is linked and persisted to an active Emergency
9. Phase 1-3 preservation: Vehicles, Junctions, Emergencies, Telemetry APIs continue working
10. Direct SQLite persistence check for road segments and emergency route
"""

import json
import sqlite3
import time
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
    print("=== 1. Check GET /health ===")
    status, body = req("http://127.0.0.1:8000/health")
    print("GET /health:", status, body)
    assert status == 200
    assert body == {"status": "ok", "service": "EMERGE-X backend"}

    print("\n=== 2. Seed and inspect demo road network ===")
    status, seed_res = req("http://127.0.0.1:8000/api/routing/seed-demo", method="POST")
    print("POST /seed-demo:", status, seed_res)
    assert status == 200

    status, demo_net = req("http://127.0.0.1:8000/api/routing/demo-network")
    print(f"GET /demo-network: {demo_net['total_roads']} road segments loaded")
    assert demo_net["total_roads"] >= 6

    print("\n=== 3. Calculate Dijkstra route from J1 to J4 ===")
    calc_payload = {
        "start_junction_id": "J1",
        "destination_junction_id": "J4",
    }
    status, route_res = req("http://127.0.0.1:8000/api/routing/calculate", method="POST", body=calc_payload)
    print("POST /api/routing/calculate:", status, route_res)
    assert status == 200
    assert route_res["route"][0] == "J1"
    assert route_res["route"][-1] == "J4"
    print(f"Optimal Path: {' -> '.join(route_res['route'])} | Total Cost: {route_res['total_cost']}")

    print("\n=== 4. Verify ordered junction sequence and upcoming junctions ===")
    assert len(route_res["junction_sequence"]) == len(route_res["route"])
    # Upcoming junctions should exclude the origin J1
    assert route_res["upcoming_junctions"] == route_res["route"][1:]
    print("Upcoming Junctions:", route_res["upcoming_junctions"])

    print("\n=== 5. Demonstrate alternative route selection when costs change ===")
    # Under default costs:
    # J1 -> J2 -> J5 -> J4 = 10 + 8 + 10 = 28.0 (Lower cost bypass)
    assert route_res["route"] == ["J1", "J2", "J5", "J4"]
    assert route_res["total_cost"] == 28.0

    # Now simulate lowering the cost of J2 -> J3 (e.g. to 2.0)
    # J1 -> J2 -> J3 -> J4 = 10 + 2 + 12 = 24.0 (< 28.0)
    conn = sqlite3.connect("backend/data/emerge_x.db")
    cur = conn.cursor()
    cur.execute("UPDATE road_segments SET cost = 2.0 WHERE road_id = 'ROAD-J2-J3'")
    conn.commit()
    conn.close()

    status, new_route_res = req("http://127.0.0.1:8000/api/routing/calculate", method="POST", body=calc_payload)
    print("Recalculated route after cost update:", new_route_res["route"], "Cost:", new_route_res["total_cost"])
    assert status == 200
    assert new_route_res["route"] == ["J1", "J2", "J3", "J4"]
    assert new_route_res["total_cost"] == 24.0

    # Restore original cost
    conn = sqlite3.connect("backend/data/emerge_x.db")
    cur = conn.cursor()
    cur.execute("UPDATE road_segments SET cost = 15.0 WHERE road_id = 'ROAD-J2-J3'")
    conn.commit()
    conn.close()

    print("\n=== 6. Error Handling: Disconnected route to J_DISCONNECTED ===")
    disconn_payload = {
        "start_junction_id": "J1",
        "destination_junction_id": "J_DISCONNECTED",
    }
    status, disconn_res = req("http://127.0.0.1:8000/api/routing/calculate", method="POST", body=disconn_payload)
    print("Disconnected route status:", status, disconn_res)
    assert status == 404
    assert "No viable path found" in disconn_res["detail"]

    print("\n=== 7. Error Handling: Nonexistent junction ===")
    bad_payload = {
        "start_junction_id": "J_NONEXISTENT",
        "destination_junction_id": "J4",
    }
    status, bad_res = req("http://127.0.0.1:8000/api/routing/calculate", method="POST", body=bad_payload)
    print("Nonexistent junction status:", status, bad_res)
    assert status == 404

    print("\n=== 8. Emergency Integration: Link calculated route to active emergency ===")
    run_id = int(time.time())
    emg_id = f"EMG-PH4-{run_id}"
    v_id = f"AMB-PH4-{run_id}"

    # Create vehicle and emergency
    req("http://127.0.0.1:8000/api/vehicles", method="POST", body={"vehicle_id": v_id, "vehicle_type": "AMBULANCE", "status": "ACTIVE"})
    req("http://127.0.0.1:8000/api/emergencies", method="POST", body={
        "emergency_id": emg_id,
        "vehicle_id": v_id,
        "emergency_type": "TRAUMA",
        "destination_hospital": "Hospital Central",
        "status": "ACTIVE",
    })

    # Calculate route with emergency_id
    emg_route_payload = {
        "start_junction_id": "J1",
        "destination_junction_id": "J4",
        "emergency_id": emg_id,
        "vehicle_id": v_id,
        "current_junction_id": "J2",  # Vehicle has progressed to J2
    }
    status, emg_route_res = req("http://127.0.0.1:8000/api/routing/calculate", method="POST", body=emg_route_payload)
    print("Emergency Route Calculated:", status, emg_route_res)
    assert status == 200
    assert emg_route_res["emergency_id"] == emg_id
    # Since current_junction_id is J2 on ["J1", "J2", "J5", "J4"], upcoming should be ["J5", "J4"]
    assert emg_route_res["upcoming_junctions"] == ["J5", "J4"]

    print("\n=== 9. Verify Emergency Record Persisted Route in Database ===")
    conn = sqlite3.connect("backend/data/emerge_x.db")
    cur = conn.cursor()
    cur.execute("SELECT emergency_id, current_route, destination_junction_id FROM emergencies WHERE emergency_id = ?", (emg_id,))
    emg_row = cur.fetchone()
    print("Direct DB row for Emergency:", emg_row)
    assert emg_row is not None
    assert json.loads(emg_row[1]) == ["J1", "J2", "J5", "J4"]
    assert emg_row[2] == "J4"
    conn.close()

    print("\n=== 10. Verify Phase 1-3 Endpoints Still Work ===")
    status, v_list = req("http://127.0.0.1:8000/api/vehicles")
    assert status == 200
    status, j_list = req("http://127.0.0.1:8000/api/junctions")
    assert status == 200
    status, e_list = req("http://127.0.0.1:8000/api/emergencies")
    assert status == 200
    status, tel_resp = req("http://127.0.0.1:8000/api/v1/telemetry/ambulance", method="POST", body={
        "vehicle_id": v_id,
        "latitude": 12.9740,
        "longitude": 77.5950,
        "speed": 50.0,
        "timestamp": 1773822800,
        "emergency_status": "ACTIVE_CRITICAL",
    })
    assert status == 200

    print("\n>>> ALL 10 PHASE 4 TESTS & ALGORITHM VERIFICATIONS PASSED! <<<")


if __name__ == "__main__":
    main()
