# EMERGE-X: Hardware–Software Integration Contract

> **LOCKED INTEGRATION CONTRACT**  
> *These contracts define the exact communication payloads and structural schemas between hardware devices, computer vision feeds, backend orchestration services, and frontend clients.*

> [!CAUTION]
> **STRICT CHANGE CONTROL POLICY**  
> These contracts are conceptually locked. **Do not silently modify these payload shapes.**  
> If an unforeseen hardware or protocol constraint requires modifying any schema below, the engineer or agent MUST explicitly flag:  
> `⚠️ HARDWARE–SOFTWARE INTEGRATION CHANGE REQUIRED`  
> and comprehensively document:
> 1. What needs to change
> 2. Why the change is required
> 3. What changes on the hardware firmware side
> 4. What changes on the backend/software side
> 5. Wait for team/lead approval before implementing the change.

---

## 1. ESP32 #1 (Ambulance) ➔ Backend Contract

ESP32 #1 samples location from the NEO-6M GPS module and transmits telemetry over HTTP POST or WebSocket to `/api/v1/telemetry/ambulance`.

### Payload Schema (JSON)

```json
{
  "vehicle_id": "AMB-01",
  "latitude": 12.9715987,
  "longitude": 77.5945627,
  "speed": 48.5,
  "timestamp": 1773822600,
  "emergency_status": "ACTIVE_CRITICAL"
}
```

### Field Definitions

| Field | Type | Description |
| :--- | :--- | :--- |
| `vehicle_id` | `string` | Unique identifier of the emergency vehicle (e.g., `AMB-01`) |
| `latitude` | `float` | WGS84 decimal degrees latitude |
| `longitude` | `float` | WGS84 decimal degrees longitude |
| `speed` | `float` | Current vehicle velocity in km/h |
| `timestamp` | `integer` | Unix epoch time in seconds (or UTC ISO-8601 string) |
| `emergency_status`| `string` | Vehicle operation state (`IDLE`, `EN_ROUTE`, `ACTIVE_CRITICAL`, `STANDBY`) |

---

## 2. ESP32 #2 (Junction Controller) ➔ Backend Contract

ESP32 #2 interfaces with the RC522 RFID reader and optional IR passage beam sensors at the physical intersection.

### 2.1 RFID Detection Event Schema

Triggered when the ambulance tag passes within detection range of the RC522 reader at the intersection approach.

```json
{
  "rfid_uid": "E280689420000000",
  "junction_id": "JNC-01",
  "timestamp": 1773822615,
  "vehicle_id": "AMB-01"
}
```

| Field | Type | Description |
| :--- | :--- | :--- |
| `rfid_uid` | `string` | Hexadecimal UID string read from the physical RC522 transponder |
| `junction_id` | `string` | Unique junction/intersection identifier (e.g., `JNC-01`) |
| `timestamp` | `integer` | Epoch timestamp of read event |
| `vehicle_id` | `string \| null` | Resolved vehicle identifier if mapped locally, otherwise resolved by backend |

### 2.2 Optional IR Break-Beam Passage Event Schema

Triggered when the physical model vehicle cuts across the IR detector confirming physical clearance of the junction box.

```json
{
  "junction_id": "JNC-01",
  "passage_detected": true,
  "timestamp": 1773822622
}
```

| Field | Type | Description |
| :--- | :--- | :--- |
| `junction_id` | `string` | Intersection identifier where passage was registered |
| `passage_detected`| `boolean` | `true` when vehicle breaks the exit clearance threshold |
| `timestamp` | `integer` | Epoch timestamp of passage trigger |

---

## 3. Backend ➔ ESP32 #2 (Junction Controller) Contract

The backend transmits priority phase actuation commands to ESP32 #2 over WebSocket or persistent HTTP long-polling to `/api/v1/junctions/{junction_id}/command`.

### Payload Schema (JSON)

```json
{
  "junction_id": "JNC-01",
  "state": "ACTIVE_PRIORITY",
  "timing": {
    "yellow_transition_sec": 3,
    "all_red_clearance_sec": 2,
    "green_corridor_sec": 30,
    "max_hold_sec": 45
  },
  "vehicle_id": "AMB-01",
  "trip_id": "TRIP-20260918-001"
}
```

### Field Definitions

| Field | Type | Description |
| :--- | :--- | :--- |
| `junction_id` | `string` | Target intersection controller ID |
| `state` | `string` | Target state (`NORMAL`, `PREPARING`, `ACTIVE_PRIORITY`, `RECOVERING`) |
| `timing` | `object` | Phase safety timings in seconds to prevent unsafe signal cycling |
| `vehicle_id` | `string` | Authorized emergency vehicle for which corridor is cleared |
| `trip_id` | `string` | Active emergency mission/trip identifier |

> [!IMPORTANT]
> **Physical Safety Assertion**: ESP32 #2 firmware must reject any state transition that would command conflicting green phases simultaneously, defaulting to safe all-red or standard flashing amber if invalid commands are received.

---

## 4. Computer Vision (OpenCV + YOLO) ➔ Backend Contract

The edge detection loop processes frames from the USB webcam and posts traffic metrics to `/api/v1/traffic/state`.

### Payload Schema (JSON)

```json
{
  "junction_id": "JNC-01",
  "timestamp": 1773822605,
  "vehicle_count": 14,
  "density": 0.72,
  "queue_estimate": 6,
  "congestion": "HIGH",
  "incident_obstruction_state": {
    "has_obstruction": false,
    "obstruction_type": null,
    "confidence": 0.0
  }
}
```

### Field Definitions

| Field | Type | Description |
| :--- | :--- | :--- |
| `junction_id` | `string` | Intersection identifier corresponding to camera zone |
| `timestamp` | `integer` | Epoch timestamp of processed frame batch |
| `vehicle_count` | `integer` | Total vehicles detected within the bounding region |
| `density` | `float` | Normalized road occupancy ratio from `0.0` (empty) to `1.0` (gridlocked) |
| `queue_estimate`| `integer` | Count of stationary or near-zero velocity vehicles queued at red phase |
| `congestion` | `string` | Qualitative rating (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`) |
| `incident_obstruction_state` | `object` | Flags lane blockages, stalled vehicles, or foreign road hazards |

---

## 5. Backend ➔ Frontend WebSocket Contract

The backend broadcasts real-time global state to connected dashboards via `/ws/live-state`.

### Payload Schema (JSON)

```json
{
  "event_type": "STATE_UPDATE",
  "timestamp": 1773822606,
  "ambulance": {
    "vehicle_id": "AMB-01",
    "location": {
      "latitude": 12.9715987,
      "longitude": 77.5945627
    },
    "speed": 48.5,
    "emergency_status": "ACTIVE_CRITICAL",
    "current_route": ["JNC-01", "JNC-02", "JNC-05", "HOSP-CENTRAL"],
    "destination": "HOSP-CENTRAL",
    "eta_seconds": 185
  },
  "junction_states": [
    {
      "junction_id": "JNC-01",
      "state": "ACTIVE_PRIORITY",
      "active_phase": "NORTH_SOUTH_GREEN",
      "time_remaining_sec": 24
    },
    {
      "junction_id": "JNC-02",
      "state": "PREPARING",
      "active_phase": "TRANSITION_TO_CLEAR",
      "time_remaining_sec": 8
    }
  ],
  "traffic_state": [
    {
      "junction_id": "JNC-01",
      "density": 0.72,
      "congestion": "HIGH"
    }
  ],
  "incidents": [
    {
      "incident_id": "INC-882",
      "edge_id": "ROAD-02-05",
      "type": "ROAD_BLOCKED",
      "reported_at": 1773822590
    }
  ],
  "reroutes": [
    {
      "trip_id": "TRIP-20260918-001",
      "previous_route": ["JNC-01", "JNC-02", "JNC-03", "HOSP-CENTRAL"],
      "new_route": ["JNC-01", "JNC-02", "JNC-05", "HOSP-CENTRAL"],
      "reason": "Congestion penalty and incident on ROAD-02-03"
    }
  ],
  "hospital_status": {
    "hospital_id": "HOSP-CENTRAL",
    "name": "City General Hospital",
    "triage_readiness": "PREPARED",
    "trauma_bay_reserved": "BAY-2"
  }
}
```

---

## 6. Contract Enforcement & Evolution Protocol

When evolving these contracts in subsequent phases:
1. Ensure backward compatibility or simultaneously update mock generators in `integrations/beeceptor/`.
2. Update Pydantic schemas in `backend/app/schemas/`.
3. Update simulated models in `simulation/`.
4. Run integration tests in `backend/tests/` before deploying firmware changes to physical ESP32 chips.
