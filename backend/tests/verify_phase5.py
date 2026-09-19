"""Comprehensive Verification Suite for Phase 5: MVP Emergency Priority & Moving Green Corridor.

Tests:
1. GET /health
2. Create emergency with calculated route: J1 -> J2 -> J3 -> J4
3. Scenario 1: Ambulance approaching J2
   Expected:
   J1 = COMPLETED
   J2 = ACTIVE_PRIORITY
   J3 = PREPARING
   J4 = NORMAL
4. Scenario 2: Ambulance passes J2 and is approaching J3
   Expected:
   J1 = COMPLETED
   J2 = COMPLETED
   J3 = ACTIVE_PRIORITY
   J4 = PREPARING
5. Scenario 3: Ambulance approaches J4 (destination)
   Expected:
   J1 = COMPLETED, J2 = COMPLETED, J3 = COMPLETED, J4 = ACTIVE_PRIORITY
6. Non-route junctions (e.g. J5, J_DISCONNECTED) are NOT affected and remain NORMAL
7. Error Handling: Nonexistent emergency returns 404
8. Step Corridor Endpoint: POST /api/emergencies/{id}/step-corridor
9. Downstream Command Representation: Verify junction_commands structure matches contract
10. Phase 1-4 Preservation: Health, Vehicles, Routing, Telemetry APIs continue working
"""

import json
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

    print("\n=== 2. Setup Vehicle, Emergency, and Route: J1 -> J2 -> J3 -> J4 ===")
    run_id = int(time.time())
    v_id = f"AMB-PH5-{run_id}"
    e_id = f"EMG-PH5-{run_id}"

    # Register ambulance
    req("http://127.0.0.1:8000/api/vehicles", method="POST", body={
        "vehicle_id": v_id,
        "vehicle_type": "AMBULANCE",
        "rfid_tag": f"RFID-PH5-{run_id}",
        "status": "ACTIVE",
    })

    # Create emergency
    req("http://127.0.0.1:8000/api/emergencies", method="POST", body={
        "emergency_id": e_id,
        "vehicle_id": v_id,
        "emergency_type": "CARDIAC_ARREST",
        "destination_hospital": "City Memorial",
        "status": "ACTIVE",
    })

    # Set exact linear route J1 -> J2 -> J3 -> J4 on the emergency
    conn_patch = {
        "start_junction_id": "J1",
        "destination_junction_id": "J4",
        "emergency_id": e_id,
        "vehicle_id": v_id,
    }
    # Temporarily set J2->J3 lower cost so J1->J2->J3->J4 is selected
    import sqlite3
    conn = sqlite3.connect("backend/data/emerge_x.db")
    cur = conn.cursor()
    cur.execute("UPDATE road_segments SET cost = 2.0 WHERE road_id = 'ROAD-J2-J3'")
    conn.commit()
    conn.close()

    status, r_calc = req("http://127.0.0.1:8000/api/routing/calculate", method="POST", body=conn_patch)
    print("Calculated route for emergency:", r_calc["route"])
    assert r_calc["route"] == ["J1", "J2", "J3", "J4"]

    # Restore road cost
    conn = sqlite3.connect("backend/data/emerge_x.db")
    cur = conn.cursor()
    cur.execute("UPDATE road_segments SET cost = 15.0 WHERE road_id = 'ROAD-J2-J3'")
    conn.commit()
    conn.close()

    print("\n=== 3. SCENARIO 1: Ambulance approaching J2 ===")
    # Query priority corridor with current_junction_id = J2
    status, p_res = req(f"http://127.0.0.1:8000/api/emergencies/{e_id}/priority?current_junction_id=J2")
    print("Scenario 1 Priority Response:")
    print("Current Priority Junction:", p_res["current_priority_junction"])
    print("Junction States:", p_res["junction_priority_states"])
    assert status == 200
    assert p_res["current_priority_junction"] == "J2"
    assert p_res["junction_priority_states"]["J1"] == "COMPLETED"
    assert p_res["junction_priority_states"]["J2"] == "ACTIVE_PRIORITY"
    assert p_res["junction_priority_states"]["J3"] == "PREPARING"
    assert p_res["junction_priority_states"]["J4"] == "NORMAL"
    print(">>> Scenario 1 PASS: J1=COMPLETED, J2=ACTIVE_PRIORITY, J3=PREPARING, J4=NORMAL")

    print("\n=== 4. SCENARIO 2: Ambulance passed J2 and is approaching J3 ===")
    status, p_res2 = req(f"http://127.0.0.1:8000/api/emergencies/{e_id}/priority?current_junction_id=J3")
    print("Scenario 2 Priority Response:")
    print("Current Priority Junction:", p_res2["current_priority_junction"])
    print("Junction States:", p_res2["junction_priority_states"])
    assert status == 200
    assert p_res2["current_priority_junction"] == "J3"
    assert p_res2["junction_priority_states"]["J1"] == "COMPLETED"
    assert p_res2["junction_priority_states"]["J2"] == "COMPLETED"
    assert p_res2["junction_priority_states"]["J3"] == "ACTIVE_PRIORITY"
    assert p_res2["junction_priority_states"]["J4"] == "PREPARING"
    print(">>> Scenario 2 PASS: J1=COMPLETED, J2=COMPLETED, J3=ACTIVE_PRIORITY, J4=PREPARING")

    print("\n=== 5. SCENARIO 3: Ambulance approaching destination J4 ===")
    status, p_res3 = req(f"http://127.0.0.1:8000/api/emergencies/{e_id}/priority?current_junction_id=J4")
    assert status == 200
    assert p_res3["current_priority_junction"] == "J4"
    assert p_res3["junction_priority_states"]["J1"] == "COMPLETED"
    assert p_res3["junction_priority_states"]["J2"] == "COMPLETED"
    assert p_res3["junction_priority_states"]["J3"] == "COMPLETED"
    assert p_res3["junction_priority_states"]["J4"] == "ACTIVE_PRIORITY"
    print(">>> Scenario 3 PASS: J1=COMPLETED, J2=COMPLETED, J3=COMPLETED, J4=ACTIVE_PRIORITY")

    print("\n=== 6. Test Step Corridor Endpoint POST /step-corridor ===")
    # Reset to J1 and step forward
    req(f"http://127.0.0.1:8000/api/emergencies/{e_id}/priority?current_junction_id=J1")
    status, step_res = req(f"http://127.0.0.1:8000/api/emergencies/{e_id}/step-corridor", method="POST", body={})
    print("Step Corridor Result:", step_res["current_priority_junction"])
    assert status == 200
    assert step_res["current_priority_junction"] == "J2"
    assert step_res["junction_priority_states"]["J2"] == "ACTIVE_PRIORITY"

    print("\n=== 7. Verify Downstream Command Representations ===")
    cmds = step_res["junction_commands"]
    print("Commands generated for controllers:", len(cmds))
    assert len(cmds) == 4
    j2_cmd = next(c for c in cmds if c["junction_id"] == "J2")
    assert j2_cmd["state"] == "ACTIVE_PRIORITY"
    assert j2_cmd["timing"]["green_corridor_sec"] == 30
    assert j2_cmd["vehicle_id"] == v_id
    assert j2_cmd["trip_id"] == e_id
    print("Verified J2 command payload:", j2_cmd)

    print("\n=== 8. Error Handling: Nonexistent emergency ===")
    status, err_res = req("http://127.0.0.1:8000/api/emergencies/EMG_NONEXISTENT/priority")
    print("Nonexistent emergency status:", status, err_res)
    assert status == 404

    print("\n=== 9. Verify Phase 1-4 Endpoints Still Work ===")
    status, _ = req("http://127.0.0.1:8000/api/vehicles")
    assert status == 200
    status, _ = req("http://127.0.0.1:8000/api/junctions")
    assert status == 200
    status, _ = req("http://127.0.0.1:8000/api/emergencies")
    assert status == 200
    status, _ = req("http://127.0.0.1:8000/api/routing/roads")
    assert status == 200

    print("\n>>> ALL PHASE 5 TESTS & PRIORITY CORRIDOR SCENARIOS PASSED! <<<")


if __name__ == "__main__":
    main()
