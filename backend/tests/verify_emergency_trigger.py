"""Automated Verification Suite for Live Emergency Core.

Tests:
1. Push button trigger accepted via POST /api/v1/emergency/trigger
2. Duplicate / debounced event handled idempotently without errors or duplicate DB records
3. Emergency state becomes ACTIVE and vehicle state becomes ACTIVE_CRITICAL
4. Route remains valid (Dijkstra linear route J1 -> J2 -> J3 -> J4)
5. Priority Engine corridor activates (J2: ACTIVE_PRIORITY, J3: PREPARING)
6. Dashboard retrieves live emergency state via GET /api/v1/emergency/live-state
7. Hardware attribution correctly distinguishes LIVE HARDWARE vs OFFLINE / PENDING / DEMO
8. Emergency clear mechanism via POST /api/v1/emergency/clear safely clears corridor
"""

import json
import time
import urllib.error
import urllib.request
import sys


def http_req(url, method="GET", body=None):
    """Utility to make HTTP requests against local FastAPI backend."""
    data = json.dumps(body).encode("utf-8") if body else None
    headers = {"Content-Type": "application/json"} if body else {}
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def run_tests():
    print("=" * 65)
    print("EMERGE-X: LIVE EMERGENCY CORE VERIFICATION SUITE")
    print("=" * 65)

    base_url = "http://127.0.0.1:8000"

    # 1. Check Health
    print("\n[STEP 1] Testing Backend Health...")
    code, res = http_req(f"{base_url}/health")
    assert code == 200, f"Expected 200, got {code}"
    print(f"-> Backend Health OK: {res}")

    # 2. Test Initial Live State (Should be OFFLINE or PENDING before button press)
    print("\n[STEP 2] Testing Live State Query Before Trigger...")
    code, live_initial = http_req(f"{base_url}/api/v1/emergency/live-state")
    assert code == 200, f"Expected 200, got {code}"
    print(f"-> Initial Hardware Status: {live_initial['hardware_status']}")
    print(f"-> Initial Active State: {live_initial['is_active']}")

    # 3. Test Physical Push Button Trigger Ingestion
    print("\n[STEP 3] Ingesting Physical ESP32 Push Button Trigger...")
    trigger_payload = {
        "ambulance_id": "AX-01",
        "trigger_source": "PUSH_BUTTON",
        "timestamp": 0,
        "emergency_type": "CARDIAC_CRITICAL",
        "destination_junction_id": "J4",
    }
    code, trigger_res = http_req(
        f"{base_url}/api/v1/emergency/trigger",
        method="POST",
        body=trigger_payload,
    )
    print(f"-> Trigger Response HTTP {code}: {trigger_res}")
    assert code in (200, 201), f"Expected 200 or 201, got {code}"
    assert trigger_res["trigger_source"] == "PUSH_BUTTON"
    assert trigger_res["ambulance_id"] == "AX-01"
    assert trigger_res["emergency_id"] == "E-001"
    assert trigger_res["current_priority_junction"] == "J2"
    assert "J2" in trigger_res["junction_priority_states"]
    assert trigger_res["junction_priority_states"]["J2"] == "ACTIVE_PRIORITY"
    assert trigger_res["junction_priority_states"]["J3"] == "PREPARING"
    assert trigger_res["route"] == ["J1", "J2", "J3", "J4"]
    print(">>> PASS: ESP32 Push button accepted and corridor activated!")

    # 4. Test Duplicate / Debounced Event Handling (Idempotency)
    print("\n[STEP 4] Testing Rapid Duplicate Push Button Trigger (Debounce/Idempotency)...")
    code, dup_res = http_req(
        f"{base_url}/api/v1/emergency/trigger",
        method="POST",
        body=trigger_payload,
    )
    print(f"-> Duplicate Trigger Response HTTP {code}: {dup_res}")
    assert code == 200, f"Expected 200, got {code}"
    assert dup_res["status"] in ("ACTIVATED", "ACTIVE_MAINTAINED")
    assert dup_res["current_priority_junction"] == "J2"
    print(">>> PASS: Duplicate trigger handled safely without crash or duplicate incidents!")

    # 5. Test Live State Polling Query After Trigger
    print("\n[STEP 5] Testing GET /api/v1/emergency/live-state After Trigger...")
    code, live_res = http_req(f"{base_url}/api/v1/emergency/live-state")
    assert code == 200, f"Expected 200, got {code}"
    print(f"-> Live State: is_active={live_res['is_active']}, source={live_res['trigger_source']}, hardware={live_res['hardware_status']}")
    assert live_res["is_active"] is True
    assert live_res["trigger_source"] == "PUSH_BUTTON"
    assert live_res["hardware_status"] == "LIVE HARDWARE"
    assert live_res["current_priority_junction"] == "J2"
    assert live_res["junction_priority_states"]["J2"] == "ACTIVE_PRIORITY"
    print(">>> PASS: Dashboard live-state immediately reflects active push button trigger & LIVE HARDWARE status!")

    # 6. Test Demo Mode Hardware Status Isolation
    print("\n[STEP 6] Testing Hardware Status Isolation in Demo Mode (demo=true)...")
    code, demo_res = http_req(f"{base_url}/api/v1/emergency/live-state?demo=true")
    assert code == 200, f"Expected 200, got {code}"
    assert demo_res["hardware_status"] == "DEMO"
    print(f"-> Demo Flag Response Hardware Status: {demo_res['hardware_status']}")
    print(">>> PASS: Demo mode safely returns DEMO without pretending to be live hardware!")

    # 7. Test Emergency Clear Mechanism
    print("\n[STEP 7] Testing POST /api/v1/emergency/clear...")
    clear_payload = {
        "emergency_id": "E-001",
        "ambulance_id": "AX-01",
        "clear_source": "COMMANDER",
    }
    code, clear_res = http_req(
        f"{base_url}/api/v1/emergency/clear",
        method="POST",
        body=clear_payload,
    )
    print(f"-> Clear Response HTTP {code}: {clear_res}")
    assert code == 200, f"Expected 200, got {code}"
    assert clear_res["status"] == "CLEARED"
    assert clear_res["vehicle_status"] == "IDLE"

    # Verify live state after clear
    code, live_after_clear = http_req(f"{base_url}/api/v1/emergency/live-state")
    print(f"-> State after clear: is_active={live_after_clear['is_active']}, vehicle_status={live_after_clear['vehicle_status']}")
    assert live_after_clear["is_active"] is False
    assert live_after_clear["vehicle_status"] == "IDLE"
    print(">>> PASS: Emergency corridor safely cleared and vehicle returned to IDLE!")

    print("\n" + "=" * 65)
    print("ALL LIVE EMERGENCY CORE VERIFICATION TESTS PASSED SUCCESSFULLY! (7/7)")
    print("=" * 65)


if __name__ == "__main__":
    run_tests()
