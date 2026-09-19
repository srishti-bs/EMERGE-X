# EMERGE-X: Hardware Subsystem

> **Physical Demonstrator & Embedded Systems Architecture**  
> *Microcontrollers: 2x ESP32 DevKit V1 | Sensors: NEO-6M GPS, RC522 RFID, Traffic LED Modules, IR Sensors*

---

## 1. Physical Hardware Overview

The physical demonstrator brings real embedded microcontrollers into the loop to validate emergency vehicle tracking, local detection zones, and traffic signal phase actuation.

```
+-----------------------------------------------------------------------------------------+
|                                    HARDWARE TOPOLOGY                                    |
|                                                                                         |
|   +--------------------------+                               +----------------------+   |
|   |   ESP32 #1 (Ambulance)   |                               |  ESP32 #2 (Junction) |   |
|   |                          |                               |                      |   |
|   |  - NEO-6M GPS Module     |                               |  - RC522 RFID Reader |   |
|   |    (Hardware UART)       |                               |    (SPI Bus)         |   |
|   |                          |                               |  - Traffic LED Mod.  |   |
|   |                          |                               |    (GPIO Relays)     |   |
|   |                          |                               |  - Opt. IR Sensors   |   |
|   |                          |                               |    (GPIO Digital In) |   |
|   +------------+-------------+                               +----------+-----------+   |
|                |                                                        |               |
+----------------|--------------------------------------------------------|---------------+
                 |                                                        |
                 | Wi-Fi / HTTP / WS                                      | Wi-Fi / HTTP / WS
                 | Telemetry Ingestion                                    | RFID & Relay Control
                 v                                                        v
+-----------------------------------------------------------------------------------------+
|                                     FASTAPI BACKEND                                     |
|                                                                                         |
|   * NO DIRECT ESP32 #1 -> ESP32 #2 WIRELESS OR SERIAL RELAY                            |
|   * All arbitration and signal switching logic is mediated centrally by backend        |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Strict Interlocking & Safety Rules

1. **No Direct Microcontroller Peering**: ESP32 #1 (Ambulance) never transmits commands or packets directly to ESP32 #2 (Junction). All telemetry flows through the FastAPI backend brain.
2. **Signal Phase Safety**: Under no circumstance may conflicting intersection approaches receive green indications simultaneously.
3. **Fail-Safe Operation**: If ESP32 #2 loses Wi-Fi connectivity with the backend, it must revert to a safe local default timing cycle or flashing yellow/amber caution mode.

---

## 3. Directory Layout

- **`hardware/ambulance_esp32/`**: Firmware and pinouts for ESP32 #1 connected to the NEO-6M GPS module.
- **`hardware/junction_esp32/`**: Firmware and pinouts for ESP32 #2 connected to the RC522 RFID reader, traffic signal modules, and optional IR sensors.
