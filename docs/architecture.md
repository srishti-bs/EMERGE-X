# EMERGE-X: System Architecture

> **AI-Powered Real-Time Emergency Mobility & Traffic Coordination System**  
> *“Clearing the way. Saving critical minutes.”*

---

## 1. Architectural Philosophy & Topology

EMERGE-X coordinates physical municipal intersections, emergency vehicles, computer vision edge analysis, and dispatcher dashboards through a unified central software brain.

### Prototype Topology (Laptop as Main Brain)

During prototype demonstration, a dedicated development laptop hosts the core software and AI pipeline:
- **FastAPI Central Brain**: Handles telemetry ingestion, state machines, graph-based routing, and WebSocket pub/sub.
- **Computer Vision Pipeline**: Consumes a USB webcam video feed to detect vehicles and quantify intersection congestion.
- **Physical Microcontrollers**: Two independent ESP32 units communicate over Wi-Fi / HTTP / WebSockets directly with the backend.
  - **ESP32 #1 (Ambulance Unit)**: Transmits NEO-6M GPS coordinates and vehicle telemetry.
  - **ESP32 #2 (Main Junction / City Controller)**: Transmits RC522 RFID and optional IR passage detections; receives traffic-light phase actuation commands.
  - **Rule**: **No direct ESP32 #1 ➔ ESP32 #2 relay.** All coordination is arbitrated logically by the backend.

```
+-----------------------------------------------------------------------------------+
|                            LOCAL PROTOTYPE LAPTOP                                 |
|                                                                                   |
|   +-----------------------+                    +------------------------------+   |
|   |   USB Webcam Stream   |                    |   React + Vite Dashboards    |   |
|   +-----------+-----------+                    +--------------^---------------+   |
|               |                                               |                   |
|               v                                               | WebSocket         |
|   +-----------------------+                    +--------------v---------------+   |
|   | OpenCV + YOLO Detect  |                    |       FastAPI Backend        |   |
|   | Traffic Density State |                    | - Telemetry Processing       |   |
|   +-----------+-----------+                    | - Graph Routing Engine       |   |
|               |                                | - Priority State Machine     |   |
|               +------------------------------->| - SQLite Persistence         |   |
|                     Traffic Metrics            +--------------+---------------+   |
+---------------------------------------------------------------|-------------------+
                                                                |
                          +-------------------------------------+-------------------------------------+
                          | Wi-Fi (HTTP / WebSocket)                                                  | Wi-Fi (HTTP / WebSocket)
                          v                                                                           v
              +-----------------------+                                                   +-----------------------+
              |  ESP32 #1 (Ambulance) |                                                   |  ESP32 #2 (Junction)  |
              |  - NEO-6M GPS Module  |                                                   |  - RC522 RFID Reader  |
              |  - Telemetry Stream   |                                                   |  - Relay Modules (TL) |
              +-----------------------+                                                   |  - Optional IR Sensor |
                                                                                          +-----------------------+
```

---

## 2. Hardware Roles & Physical Demonstrator

1. **ESP32 #1 (Ambulance Unit)**
   - Interfaced with a **NEO-6M GPS module**.
   - Periodically samples geodetic location, heading, velocity, and mission status.
   - Posts standardized telemetry packets to the backend.

2. **ESP32 #2 (Main Junction Controller)**
   - Interfaces with an **RC522 RFID reader** positioned at the intersection entry zone.
   - Detects authorized ambulance tags (e.g., tag assigned to `AMB-01`).
   - Actuates physical multi-phase LED traffic light modules (Red, Yellow, Green).
   - Interfaces optionally with digital **IR break-beam sensors** to confirm vehicle passage through the intersection box.
   - Strict Safety Rule: Under no circumstance will conflicting intersection phases ever receive a green signal simultaneously.

3. **Physical Demonstrator vs. Software Digital Twin**
   - The physical scale model demonstrates a subset of 4 active, hardware-instrumented junctions on a demonstrator layout.
   - The software engine models a scalable **Digital Twin** consisting of ~15 intersections, dynamic background traffic, multiple hospital drop-off options, and unpredictable road obstructions.

---

## 3. Computer Vision & Edge Traffic Analysis

- **Hardware**: Standard USB webcam mounted above the prototype intersection.
- **Software**: Python, OpenCV, and YOLO (You Only Look Once).
- **Functional Boundary**: YOLO is utilized solely as a **real-time object detector** (detecting cars, buses, trucks, obstructions).
- **Important Distinction**: YOLO is **not** a traffic prediction engine. High-level traffic prediction, queue estimation, and historical trends are synthesized by downstream traffic intelligence services using detection outputs, sensor histories, and simulation heuristics.

---

## 4. Emergency Priority & Green Corridor State Machine

The backend orchestrates a moving green corridor that progresses ahead of the emergency vehicle. Each junction along the active route transitions through a deterministic state machine:

```
    +-------------------------------------------------------------+
    |                                                             |
    v                                                             |
+--------+      Ambulance Approaching      +-----------+          |
| NORMAL | -----------------------------> | PREPARING |          |
+--------+       (Distance / ETA Threshold)|     |     |          |
                                           +-----+-----+          |
                                                 | Clean Phase    |
                                                 v                |
                                        +-----------------+       |
                                        | ACTIVE_PRIORITY |       |
                                        +--------+--------+       |
                                                 |                |
                                                 | RFID or IR     |
                                                 | Passage Event  |
                                                 v                |
                                       +--------------------+     |
                                       |  PASSAGE_DETECTED  |     |
                                       +---------+----------+     |
                                                 |                |
                                                 | Clearance Hold |
                                                 v                |
                                          +-------------+         |
                                          | RECOVERING  | --------+
                                          +-------------+  Normal Cycle Resumed
```

### State Machine Phases
1. **NORMAL**: Intersection operates standard fixed-time or demand-actuated cycles. Conflicting phases alternate safely.
2. **PREPARING**: The approaching emergency vehicle breaches the warning boundary (e.g., 30–45s ETA). Active green phases prepare to safely transition via yellow to all-red, clearing any lingering vehicles in the intersection box.
3. **ACTIVE_PRIORITY**: The target corridor phase switches to green. Conflicting phases are locked in red.
4. **PASSAGE_DETECTED**: Confirmed by RC522 RFID read (`AMB-01`) or IR passage detection at the intersection exit.
5. **RECOVERING**: Corridor green completes; clearance all-red interval executes before returning the junction to the NORMAL cycle safely.

---

## 5. Dynamic Routing & Rerouting Engine

The road network is represented in the backend as a directed weighted graph $G = (V, E)$:
- **Vertices ($V$)**: Intersections, highway merges, hospital entry bays.
- **Edges ($E$)**: Road segments connecting vertices.

### Dynamic Edge Cost Formulation
The cost $C_e$ of traversing an edge $e$ is continuously evaluated:
$$C_e = \text{base\_length} \times f(\text{speed\_limit}) + w_1 \cdot \text{density}_{\text{YOLO}} + w_2 \cdot \text{queue\_length} + w_3 \cdot \text{incident\_penalty} + w_4 \cdot \text{junction\_delay}$$

- **Graph Algorithms**: Dijkstra or $A^*$ computes the optimal path from current GPS coordinates to the designated hospital.
- **Continuous Rerouting**: If an incident or severe gridlock is reported on an upcoming edge, the routing engine immediately re-computes an alternate optimal path and broadcasts route change alerts to the driver and commander.

---

## 6. Frontend Dashboards

The single-page React application serves three dedicated operational roles:

1. **Driver Dashboard**: Clean, low-cognitive-load heads-up display showing vehicle ID, current GPS coordinates, live navigation route, next junction priority status, ETA, and immediate reroute instructions.
2. **Commander Dashboard**: City-wide digital twin map view displaying all tracked ambulances, live intersection signal states, YOLO traffic heatmaps, active blockages, and override controls.
3. **Hospital Triage Dashboard**: Emergency department coordination view showing incoming ambulance IDs, patient severity tiers, real-time ETA countdown, and bed/trauma room preparation flags.
