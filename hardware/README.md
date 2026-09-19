## Emerge-X Hardware Architecture

Emerge-X uses an ESP32 Dev Module as the central controller for emergency traffic prioritization.

The primary emergency-vehicle identification mechanism is an RC522 RFID reader. An RFID tag associated with the ambulance is detected, and the corresponding event is processed by the software layer to identify the approaching lane.

The software then communicates the lane-priority decision to the ESP32. The ESP32 controls four traffic-light modules. When an emergency is identified, the selected lane is switched to GREEN while all other lanes are switched to RED. This priority state is maintained for 7 seconds, after which the system automatically resumes normal traffic operation.

Two push buttons are included as backup/manual emergency triggers for prototype testing and demonstration.

A NEO-M8N GPS module is integrated with the ESP32 through UART to provide location and telemetry data. GPS data can be transmitted through the ESP32's integrated Wi-Fi connection to the backend for monitoring, event logging, and future location-based features.

The traffic-light control is performed locally by the ESP32, allowing the emergency-priority mechanism to continue operating independently of backend availability.

### Hardware Architecture

```text
                    ┌──────────────────────┐
                    │      AMBULANCE       │
                    │                      │
                    │   RFID Emergency     │
                    │        Tag           │
                    └──────────┬───────────┘
                               │
                               │ RFID
                               ▼
                    ┌──────────────────────┐
                    │    RC522 RFID        │
                    │       Reader         │
                    │                      │
                    │ Primary Detection    │
                    └──────────┬───────────┘
                               │
                               │ RFID Event
                               ▼
                    ┌──────────────────────┐
                    │ Software / Backend   │
                    │                      │
                    │ Lane Identification  │
                    └──────────┬───────────┘
                               │
                               │ Lane Decision
                               ▼
                    ┌──────────────────────┐
                    │       ESP32          │
                    │                      │
                    │ Central Controller   │
                    └───────┬───────┬──────┘
                            │       │
              ┌─────────────┘       └──────────────┐
              │                                    │
              ▼                                    ▼
    ┌─────────────────────┐              ┌─────────────────────┐
    │ 4 Traffic Lights    │              │     NEO-M8N GPS     │
    │                     │              │                     │
    │ TL1 – North         │              │ Latitude            │
    │ TL2 – East          │              │ Longitude           │
    │ TL3 – South         │              │ Speed               │
    │ TL4 – West          │              │ Telemetry           │
    └─────────────────────┘              └──────────┬──────────┘
                                                    │
                                                    │ UART
                                                    ▼
                                           ┌──────────────────┐
                                           │ ESP32 Integrated  │
                                           │ Wi-Fi             │
                                           └────────┬─────────┘
                                                    │
                                                    ▼
                                           ┌──────────────────┐
                                           │ Backend /        │
                                           │ Dashboard        │
                                           │                  │
                                           │ Monitoring &     │
                                           │ Event Logging    │
                                           └──────────────────┘


                    BACKUP / MANUAL INPUT

              ┌──────────────┐    ┌──────────────┐
              │ Push Button  │    │ Push Button  │
              │      1       │    │      2       │
              └──────┬───────┘    └──────┬───────┘
                     │                   │
                     └─────────┬─────────┘
                               ▼
                            ESP32
                               │
                               ▼
                      Emergency Priority
```

### System Operation

1. The ambulance carries an authorized RFID tag.
2. The RC522 RFID reader detects the RFID tag.
3. The RFID event is processed by the software layer.
4. The software determines the approaching ambulance lane.
5. The lane-priority command is sent to the ESP32.
6. The ESP32 switches the selected lane to GREEN.
7. All other traffic lanes are switched to RED.
8. Emergency priority remains active for 7 seconds.
9. The ESP32 restores the normal traffic-light sequence.
10. GPS data is available through the NEO-M8N module for telemetry and backend monitoring.

### Primary and Backup Inputs

| Component         | Role      | Purpose                                         |
| ----------------- | --------- | ----------------------------------------------- |
| RC522 RFID Reader | Primary   | Emergency vehicle detection                     |
| RFID Tag          | Primary   | Ambulance identification                        |
| Push Button 1     | Backup    | Manual emergency trigger                        |
| Push Button 2     | Backup    | Manual/alternate emergency trigger              |
| NEO-M8N GPS       | Telemetry | Location, speed and future positioning features |

### Traffic Light GPIO Mapping

| Traffic Light | Direction      |   Green |  Yellow |     Red |
| ------------- | -------------- | ------: | ------: | ------: |
| TL1           | North / Lane 1 | GPIO 25 | GPIO 26 | GPIO 27 |
| TL2           | East / Lane 2  | GPIO 14 | GPIO 12 | GPIO 13 |
| TL3           | South / Lane 3 | GPIO 18 | GPIO 19 | GPIO 21 |
| TL4           | West / Lane 4  | GPIO 32 | GPIO 33 | GPIO 23 |

### Emergency Priority Logic

```text
RFID Detected
      ↓
Software Identifies Lane
      ↓
ESP32 Receives Lane Decision
      ↓
Selected Lane → GREEN
Other Lanes → RED
      ↓
7-Second Emergency Priority
      ↓
Normal Traffic Operation Restored
```

### Hardware Components

1. ESP32 Dev Module — Central microcontroller with integrated Wi-Fi and Bluetooth
2. RC522 RFID Reader — Primary emergency vehicle detection
3. RFID Tag — Emergency vehicle identification
4. 4 × Traffic Light Modules — Red, yellow and green signal outputs
5. 2 × Push Buttons — Backup/manual emergency triggers
6. NEO-M8N GPS Module — Location and telemetry
7. Breadboard and Jumper Wires — Prototyping and interconnections
8. USB Cable / 5V Power Supply — ESP32 power and programming

### Hardware–Software Coordination

```text
RFID Detection
      ↓
Emergency Event
      ↓
Software Lane Identification
      ↓
ESP32
      ↓
Traffic Signal Control
      ↓
7-Second Priority
      ↓
Normal Traffic Sequence
```

The RFID system remains the primary emergency detection mechanism, while the push buttons provide a backup trigger for the prototype. The GPS module operates as a telemetry and integration layer rather than directly controlling the traffic lights.
 
