# EMERGE-X: Backend Subsystem

> **Central Software Brain & Orchestration Engine**  
> *Framework: Python 3.11+ / FastAPI / Uvicorn / SQLite / SQLAlchemy*

---

## 1. Directory Overview

The `backend` package serves as the central backend for EMERGE-X. During Phase 5, it establishes the dynamic emergency priority engine and moving green corridor sequencing across upcoming intersections.

```
backend/
├── app/
│   ├── api/          # REST route handlers & API routers
│   │   ├── emergencies.py  # Emergency lifecycle & Priority Corridor (/api/emergencies/{id}/priority)
│   │   ├── junctions.py    # Junction CRUD (/api/junctions)
│   │   ├── routing.py      # Route calculation & graph endpoints (/api/routing)
│   │   ├── telemetry.py    # Hardware telemetry contract (/api/v1/telemetry/ambulance)
│   │   ├── vehicles.py     # Vehicle CRUD & GPS location (/api/vehicles)
│   │   └── __init__.py
│   ├── database/     # SQLite database engine, session factory, Base, and init_db
│   │   ├── session.py
│   │   └── __init__.py
│   ├── models/       # SQLAlchemy ORM entity models (EmergencyVehicle, Emergency, Junction, RoadSegment)
│   │   ├── emergency.py
│   │   ├── junction.py
│   │   ├── road.py
│   │   ├── vehicle.py
│   │   └── __init__.py
│   ├── schemas/      # Pydantic schemas for request validation & response serialization
│   │   ├── emergency.py
│   │   ├── junction.py
│   │   ├── priority.py     # Priority states, responses, and command representations
│   │   ├── routing.py
│   │   ├── vehicle.py
│   │   └── __init__.py
│   ├── services/     # Core domain services
│   │   ├── priority.py     # Moving green corridor priority engine
│   │   └── routing.py      # Dijkstra algorithm & graph solvers
│   ├── main.py       # FastAPI application entrypoint with lifespan DB & demo graph initialization
│   └── config.py     # Application configuration & database path settings
├── data/             # Local database directory (ignored by git)
│   └── emerge_x.db   # SQLite local database
├── tests/            # Automated test suite
├── requirements.txt  # Python dependencies (FastAPI, Uvicorn, SQLAlchemy)
└── README.md         # Backend setup and execution guide
```

---

## 2. Moving Green Corridor State Machine

The priority engine converts a calculated emergency route (e.g. `J1 -> J2 -> J3 -> J4`) into a dynamic moving priority window:

```
[Passed Junctions]          [Approaching]           [Next Upcoming]          [Future Inactive]
       v                          v                        v                         v
   COMPLETED        ------> ACTIVE_PRIORITY ------>    PREPARING     ------>      NORMAL
 (Resumes normal)          (Green corridor held)   (Clearing conflicts)    (Standard cycling)
```

### State Definitions
- **`COMPLETED`**: Ambulance has traversed and cleared the intersection. The junction is released from priority hold.
- **`ACTIVE_PRIORITY`**: Emergency vehicle is actively approaching or within the intersection box. The corridor green phase is asserted.
- **`PREPARING`**: The immediate next intersection prepares its phase sequence, safely cycling conflicting movements to yellow/red.
- **`NORMAL`**: All other junctions on or off the route remain in standard municipal timing cycles. **The system NEVER turns all city signals green simultaneously.**

---

## 3. Corridor Scenarios (Route: J1 -> J2 -> J3 -> J4)

| Progress Stage | J1 State | J2 State | J3 State | J4 State | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Scenario 1: Approaching J2** | `COMPLETED` | `ACTIVE_PRIORITY` | `PREPARING` | `NORMAL` | J1 cleared; J2 green; J3 prepares |
| **Scenario 2: Approaching J3** | `COMPLETED` | `COMPLETED` | `ACTIVE_PRIORITY` | `PREPARING` | J2 cleared; J3 green; J4 prepares |
| **Scenario 3: Approaching J4** | `COMPLETED` | `COMPLETED` | `COMPLETED` | `ACTIVE_PRIORITY` | Final approach to destination hospital |

---

## 4. API Endpoints & Example Requests

### Health Check Endpoint
- **URL**: `GET http://127.0.0.1:8000/health`
- **Response**: `{"status": "ok", "service": "EMERGE-X backend"}`

---

### Priority & Corridor Endpoints

#### 1. Inspect Emergency Priority Corridor (`GET /api/emergencies/{emergency_id}/priority`)
```bash
curl -X GET http://127.0.0.1:8000/api/emergencies/EMG-001/priority
```
*Query with specific corridor position:*
```bash
curl -X GET "http://127.0.0.1:8000/api/emergencies/EMG-001/priority?current_junction_id=J2"
```

**Example Response**:
```json
{
  "emergency_id": "EMG-001",
  "vehicle_id": "AMB-01",
  "route": ["J1", "J2", "J3", "J4"],
  "current_priority_junction": "J2",
  "junction_priority_states": {
    "J1": "COMPLETED",
    "J2": "ACTIVE_PRIORITY",
    "J3": "PREPARING",
    "J4": "NORMAL"
  },
  "junction_states_list": [
    {"junction_id": "J1", "state": "COMPLETED"},
    {"junction_id": "J2", "state": "ACTIVE_PRIORITY"},
    {"junction_id": "J3", "state": "PREPARING"},
    {"junction_id": "J4", "state": "NORMAL"}
  ],
  "current_ambulance_location": {
    "latitude": 12.974,
    "longitude": 77.595,
    "speed": 50.0,
    "timestamp": 1773822800,
    "emergency_status": "ACTIVE_CRITICAL"
  },
  "junction_commands": [
    {
      "junction_id": "J2",
      "state": "ACTIVE_PRIORITY",
      "timing": {
        "yellow_transition_sec": 3,
        "all_red_clearance_sec": 2,
        "green_corridor_sec": 30,
        "max_hold_sec": 45
      },
      "vehicle_id": "AMB-01",
      "trip_id": "EMG-001"
    }
  ]
}
```

#### 2. Advance Corridor Progress (`POST /api/emergencies/{emergency_id}/step-corridor`)
```bash
curl -X POST http://127.0.0.1:8000/api/emergencies/EMG-001/step-corridor \
  -H "Content-Type: application/json" \
  -d '{"next_junction_id": "J3"}'
```

---

## 5. Current Phase Status

> [!NOTE]
> **PHASE 5: MVP EMERGENCY PRIORITY & MOVING GREEN CORRIDOR COMPLETED**  
> Dynamic priority sequencing, single-junction corridor progression, downstream controller command preparation, and simulation step endpoints are active.  
> Physical ESP32 microcontrollers, RC522 RFID SPI drivers, traffic relay hardware, and WebSockets belong to upcoming phases.
