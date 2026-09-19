# ESP32 #1: Ambulance Emergency Trigger & Telemetry Unit

> **Hardware Component: In-Vehicle Emergency Core Node**  
> *Controller: ESP32 DevKit V1 | Physical Trigger: Push Button (GPIO 4) | Optional GPS: NEO-6M (UART)*

---

## 1. System Overview & Physical Flow

The Ambulance ESP32 unit serves as the physical initiator for the EMERGE-X green corridor system. When the paramedic or driver presses the physical push button on the vehicle dash:

```
[Physical Push Button]
       │ (Pressed: Active-LOW on GPIO 4)
       ▼
   [ESP32]
       │ (50ms Software Debounce + 5s Duplicate Lockout)
       ▼
[Wi-Fi HTTP Client]
       │ POST /api/v1/emergency/trigger {"ambulance_id": "AX-01", "trigger_source": "PUSH_BUTTON"}
       ▼
[FastAPI Backend]
       │ (DB Status -> ACTIVE | Dijkstra Route Check | Corridor Actuation)
       ▼
[Priority Corridor]
       │ J2: ACTIVE_PRIORITY | J3: PREPARING | Moving Green Signal
       ▼
[React Dashboards]
```

---

## 2. Hardware Wiring

### Physical Push Button (Emergency Trigger)
| ESP32 DevKit Pin | Push Button Terminal | Logic Description |
| :--- | :--- | :--- |
| **GPIO 4** | Terminal A | Input with internal `INPUT_PULLUP` (Idle = HIGH, Pressed = LOW) |
| **GND** | Terminal B | Ground return |

### Visual Feedback LED
| ESP32 DevKit Pin | Component | Behavior |
| :--- | :--- | :--- |
| **GPIO 2** | Onboard Blue LED | Rapid 3x blink on trigger press; stays **solid ON** when backend returns 200 OK |

### (Optional) NEO-6M GPS Module
| ESP32 DevKit Pin | GPS Module Pin | Configuration |
| :--- | :--- | :--- |
| **GPIO 16 (RX2)** | TX | Receives NMEA stream at 9600 baud |
| **GPIO 17 (TX2)** | RX | Transmit (optional) |
| **3V3 or 5V** | VCC | Power |
| **GND** | GND | Ground |

---

## 3. Backend Endpoints

### 1. Trigger Emergency (`POST /api/v1/emergency/trigger`)
- **URL**: `http://<USER_COMPUTER_LAN_IP>:8000/api/v1/emergency/trigger`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "ambulance_id": "AX-01",
    "trigger_source": "PUSH_BUTTON",
    "timestamp": 0,
    "emergency_type": "CARDIAC_CRITICAL",
    "destination_junction_id": "J4"
  }
  ```
- **Response**:
  ```json
  {
    "status": "ACTIVATED",
    "emergency_id": "E-001",
    "ambulance_id": "AX-01",
    "trigger_source": "PUSH_BUTTON",
    "route": ["J1", "J2", "J3", "J4"],
    "current_priority_junction": "J2",
    "junction_priority_states": {
      "J1": "COMPLETED",
      "J2": "ACTIVE_PRIORITY",
      "J3": "PREPARING",
      "J4": "NORMAL"
    },
    "message": "Emergency priority green corridor active for ambulance AX-01",
    "timestamp": 1726720000
  }
  ```

### 2. Clear Emergency (`POST /api/v1/emergency/clear`)
- **URL**: `http://<USER_COMPUTER_LAN_IP>:8000/api/v1/emergency/clear`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "emergency_id": "E-001",
    "ambulance_id": "AX-01",
    "clear_source": "MANUAL"
  }
  ```

### 3. Live State Query (`GET /api/v1/emergency/live-state`)
- **URL**: `http://<USER_COMPUTER_LAN_IP>:8000/api/v1/emergency/live-state`
- Returns active status, route, corridor junction states, and explicit hardware status (`LIVE HARDWARE`, `DEMO`, `OFFLINE`, or `PENDING`).

---

## 4. Wi-Fi & LAN Network Configuration

> [!IMPORTANT]
> **Use Computer LAN IP Address (Do NOT use localhost or 127.0.0.1)**  
> The ESP32 is a separate physical device on your local Wi-Fi. It cannot resolve `localhost`.
> Run `ipconfig` in Windows PowerShell and look for **IPv4 Address** (e.g. `192.168.1.50`).

In `ambulance_esp32.ino`:
```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_HOST  = "192.168.X.X"; // Enter your PC's LAN IP
const int   BACKEND_PORT  = 8000;
```

---

## 5. Debouncing & Duplicate Prevention

To prevent continuous HTTP spamming when a physical button is held down or rapidly rattled:
1. **Software Debounce**: 50 ms contact stabilization delay.
2. **Cooldown Lockout**: 5000 ms (5-second) lockout window where subsequent presses are ignored.
3. **Backend Idempotency**: If the emergency is already `ACTIVE`, the backend maintains current corridor status and returns HTTP 200 without creating duplicate records or throwing errors.
