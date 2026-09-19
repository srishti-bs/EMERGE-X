# EMERGE-X: Simulation Subsystem & Digital Twin

> **Synthetic Environment, GPS Streams & City-Scale Digital Twin**  
> *Scale: Expanding the 4-Junction Physical Demonstrator to ~15 Simulated Intersections*

---

## 1. The Digital Twin Concept

While the physical cardboard scale model provides tangible proof of concept for 4 instrumented junctions, real-world emergency mobility requires validation across complex municipal networks.

The `simulation` subsystem provides a software **Digital Twin** capable of simulating:
- **Network Scale**: ~15 interconnected junctions and multi-lane road corridors.
- **Destinations**: Multiple competing hospital receiving facilities with varying triage capacities.
- **Vehicular Fleet**: 1–2 active emergency ambulances navigating among dozens of synthetic commuter vehicles.
- **Dynamic Perturbations**: Sudden road construction, accidents, and localized traffic jams to evaluate real-time rerouting efficiency.

```
+------------------------------------+        +------------------------------------+
|     Physical Prototype Scale       |        |        Software Digital Twin       |
|                                    |        |                                    |
|   - 4 Physical Junctions           |  --->  |   - ~15 Digital Graph Nodes        |
|   - 1 Toy Ambulance + Tag          |        |   - 2 Active Emergency Vehicles    |
|   - RC522 RFID & Relays            |        |   - Background Traffic Dynamics    |
|   - USB Camera Over Box            |        |   - Dynamic Road Closures/Accidents|
+------------------------------------+        +------------------------------------+
```

---

## 2. Directory Breakdown

- **`simulation/gps/`**:
  - Synthesizes realistic NEO-6M GPS NMEA/JSON telemetry streams along designated graph edges.
  - Simulates vehicle acceleration, deceleration at junctions, and emergency corridor travel.
- **`simulation/traffic/`**:
  - Simulates ambient city traffic flow, queue buildup at red phases, and dispersal when signals clear.
  - Generates synthetic density states to stress-test routing algorithms when the physical camera is idle.
- **`simulation/incidents/`**:
  - Triggers road blockages, construction closures, and multi-vehicle collisions.
  - Verifies that the backend priority and rerouting engines autonomously compute and broadcast alternative corridors.

---

## 3. Current Phase Status

> [!IMPORTANT]
> **No simulation logic or synthetic traffic generators are implemented yet.**  
> The directory structure defines the isolation boundaries between GPS emulation, traffic background noise, and scenario disruption suites. Full simulation scripts will be implemented during subsequent testing phases.
