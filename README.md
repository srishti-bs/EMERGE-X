# EMERGE-X

> **AI-Powered Real-Time Emergency Mobility & Traffic Coordination System**  
> *“Clearing the way. Saving critical minutes.”*

---

## ⚠️ Current Development Phase Notice

**PHASE: Initial Repository Architecture & Setup Only**

> [!IMPORTANT]
> **No application logic, dashboards, routing engines, YOLO models, or hardware communication protocols are implemented in this phase.**  
> This repository currently provides the locked directory layout, architectural boundaries, communication schemas, configuration skeletons, and integration contracts required to scaffold upcoming development.

---

## 1. Project Overview

EMERGE-X is an intelligent emergency mobility platform designed to dramatically reduce ambulance response and transit times. By dynamically coordinating traffic signals, tracking emergency vehicle telemetry, running edge computer vision for junction density analysis, and computing dynamic detour routing around gridlocks and incidents, EMERGE-X creates a safe, self-orchestrating **Emergency Green Corridor**.

---

## 2. High-Level Architecture

The prototype system designates a local development laptop as the primary software and AI compute brain. Both physical microcontroller units (Ambulance ESP32 and Junction ESP32) communicate logically through the central backend—there is **no direct peer-to-peer ESP32-to-ESP32 relay**.

```
                           +------------------------+
                           |  ESP32 #1 (Ambulance)  |
                           |  NEO-6M GPS Telemetry  |
                           +-----------+------------+
                                       |
                                       | HTTP / WebSocket Telemetry
                                       v
+-----------------------+     +------------------+     +------------------------+
|  USB Camera / Stream  | --> |                  | <-- |   ESP32 #2 (Junction)  |
|  OpenCV + YOLO Detect |     |  FastAPI Backend |     |   RC522 RFID Events    |
|  (Traffic Density)    |     |  - Central Brain |     |   IR Passage Detect    |
+-----------------------+     |  - SQLite DB     |     |   Traffic Light Relay  |
                              |  - Priority Core |     +------------------------+
                              |  - Graph Router  |                 ^
                              +--------+---------+                 |
                                       |              Signal State Commands
                                       | WebSocket Broadcast       |
                                       v                           |
                              +------------------+                 |
                              | React + Vite UI  |                 |
                              | - Driver Dash    |                 |
                              | - Commander Dash |                 |
                              | - Hospital Dash  |                 |
                              +------------------+                 |
                                       |                           |
                                       +---------------------------+
```

---

## 3. Technology Stack

| Layer | Technologies | Role / Notes |
| :--- | :--- | :--- |
| **Backend** | Python, FastAPI, WebSockets | Central orchestration brain, REST APIs, priority engine, event broker |
| **Database** | SQLite (initial), PostgreSQL (future) | Local lightweight persistence for nodes, trips, and logs |
| **Frontend** | React, Vite, JavaScript, HTML/CSS | Real-time monitoring dashboards (Driver, Commander, Hospital) |
| **Computer Vision** | Python, OpenCV, YOLO, PyTorch | Edge vehicle detection, queue length estimation, junction density |
| **Routing** | Graph algorithms (Dijkstra / A*) | Dynamic route calculation with real-time incident & congestion penalties |
| **Hardware** | ESP32 (x2), NEO-6M GPS, RC522 RFID | Ambulance telemetry, RFID tag identification (`AMB-01`), signal actuation |
| **Deployment** | Render (future cloud), `.xyz` domain | Future public access; prototype AI vision runs on local laptop |
| **Sponsors** | Beeceptor, n8n, Render, .xyz | API mocking, workflow automation, hosting, custom domain |

---

## 4. Repository Structure

```
EMERGE-X/
│
├── backend/                  # FastAPI central brain, REST & WebSocket APIs, SQLite DB
│   ├── app/
│   │   ├── api/              # API routes (emergency, telemetry, junctions, signals)
│   │   ├── database/         # SQLite connection & session management
│   │   ├── models/           # SQLAlchemy database models
│   │   ├── schemas/          # Pydantic schemas and serialization models
│   │   ├── services/         # Business logic (priority, routing, coordination)
│   │   ├── main.py           # FastAPI application entrypoint
│   │   └── config.py         # Global application configuration
│   ├── tests/                # Automated unit and integration tests
│   ├── requirements.txt      # Python backend dependencies
│   └── README.md
│
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Driver, Commander, and Hospital dashboards
│   │   ├── services/         # WebSocket & REST client services
│   │   └── App.jsx           # Root application component
│   ├── package.json          # Frontend dependencies & scripts
│   └── README.md
│
├── ai/                       # Computer vision & traffic density analysis
│   ├── detection/            # YOLO vehicle detection & edge camera utilities
│   ├── traffic/              # Vehicle count, queue estimation, occupancy analysis
│   └── models/               # Model configuration & metadata (no weights committed)
│
├── simulation/               # Digital Twin simulation environment
│   ├── gps/                  # Simulated ambulance movement & synthetic GPS
│   ├── traffic/              # Synthetic city vehicle flows & intersection congestion
│   └── incidents/            # Dynamic road blockages, accidents, and disruptions
│
├── hardware/                 # Microcontroller firmware & wiring specifications
│   ├── ambulance_esp32/      # ESP32 #1 + NEO-6M GPS firmware & wiring
│   └── junction_esp32/       # ESP32 #2 + RC522 RFID + Traffic Lights + IR firmware
│
├── integrations/             # Third-party & sponsor integration bridges
│   ├── beeceptor/            # API mocking & contract simulation endpoints
│   ├── n8n/                  # Event-driven notification workflows & alert webhooks
│   └── README.md
│
├── deployment/               # Cloud hosting & production configuration
│   ├── render/               # Render deployment manifests & environment specs
│   └── README.md
│
├── docs/                     # System architecture & integration documentation
│   ├── architecture.md       # Detailed system design & component interaction
│   ├── integration-contract.md # Locked hardware-software data contracts
│   ├── sponsor-integrations.md # Sponsor platforms & usage boundaries
│   └── deployment.md         # Deployment roadmap & operational constraints
│
├── .gitignore                # Global ignore rules (Python, Node, AI weights, IDEs)
├── README.md                 # Root project documentation
└── LICENSE                   # License placeholder
```

---

## 5. Upcoming Implementation Milestones

1. **Hardware & Contract Validation**: Simulate and verify telemetry payloads via Beeceptor mocks.
2. **Backend Core**: Stand up FastAPI REST endpoints and WebSocket channels with SQLite schema migrations.
3. **Hardware Firmware**: Flash ESP32 #1 (GPS ingestion) and ESP32 #2 (RFID detection and relay safety cycling).
4. **Computer Vision Pipeline**: Ingest local webcam frames, run YOLO detection, and publish traffic density states.
5. **Dynamic Priority & Routing**: Implement graph-based Dijkstra/A* routing and automated green corridor sequencing.
6. **Dashboards**: Deliver specialized views for Drivers, City Commanders, and Hospital triage teams.
7. **Automation & Cloud**: Wire n8n alerting webhooks and deploy staging instances to Render with `.xyz` domains.
