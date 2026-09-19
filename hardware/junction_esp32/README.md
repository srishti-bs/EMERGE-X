# ESP32 #2: Main Junction / City Controller

> **Hardware Component: Intersection Signal & Local Detection Controller**  
> *Controller: ESP32 DevKit V1 | Peripherals: RC522 RFID (SPI), Traffic Light LEDs, Optional IR Break-Beam*

---

## 1. Hardware Responsibilities

1. **Traffic Light Control**: Actuate physical Red, Yellow, and Green LED indicator modules for intersection phases via digital GPIO / relay pins.
2. **RFID Tag Detection**: Interface with an **RC522 13.56MHz RFID reader** over SPI to register incoming emergency vehicles.
   - Example vehicle identity tag: `AMB-01`.
   - **Detection Zone**: The RC522 operates in near-field proximity (2–5 cm). It is intended to register vehicle arrival at a defined approach stop line or entry gate on the physical model, not long-distance detection.
3. **Optional IR Passage Detection**: Read digital IR break-beam sensors placed at the intersection clearance line to confirm that the emergency vehicle has exited the junction box.
   - Note: IR sensors detect physical presence only; they do **not** identify vehicle identity.
4. **Command Ingestion**: Receive priority phase commands from the backend and execute safe signal transitions.

---

## 2. Signal Safety & Interlocking Rules

> [!CAUTION]
> **Zero-Tolerance Conflict Safety Rule**  
> Conflicting traffic approaches must **never** be illuminated green simultaneously.  
> Signal cycling must always enforce:
> 1. Active Green $\rightarrow$ Minimum 3s Yellow transition.
> 2. Yellow $\rightarrow$ Minimum 2s All-Red clearance interval.
> 3. Priority Corridor $\rightarrow$ Green phase activation.

---

## 3. Communication Schemas

### RFID Ingestion Event (ESP32 #2 ➔ Backend)
```json
{
  "rfid_uid": "E280689420000000",
  "junction_id": "JNC-01",
  "timestamp": 1773822615,
  "vehicle_id": "AMB-01"
}
```

### Signal Command (Backend ➔ ESP32 #2)
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

---

## 4. Pinout & Bus Assignments (Planned)

| Component | ESP32 GPIO | Bus / Protocol |
| :--- | :--- | :--- |
| RC522 `SDA` (SS) | `GPIO 5` | SPI Chip Select |
| RC522 `SCK` | `GPIO 18` | SPI Clock |
| RC522 `MOSI` | `GPIO 23` | SPI MOSI |
| RC522 `MISO` | `GPIO 19` | SPI MISO |
| RC522 `RST` | `GPIO 22` | Digital Output |
| Phase 1 Red / Yel / Grn | `GPIO 25`, `GPIO 26`, `GPIO 27` | Digital Outputs |
| Phase 2 Red / Yel / Grn | `GPIO 12`, `GPIO 13`, `GPIO 14` | Digital Outputs |
| Optional IR Sensor Out | `GPIO 34` | Digital Input |

---

## 5. Current Phase Status

> [!NOTE]
> Microcontroller firmware files are not implemented in this initial repository architecture phase.
