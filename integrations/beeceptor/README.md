# Sponsor Integration: Beeceptor

> **Role: API Mocking, Virtual Hardware Simulation & Contract Validation**  
> *Status: Scaffold Reserved for Future Test Mocks*

---

## 1. Integration Purpose

Beeceptor provides a rapid mock server environment to simulate both inbound hardware telemetry and outbound backend responses before physical microcontrollers or cloud services are ready.

---

## 2. Planned Mocks & Simulators

1. **Ambulance Telemetry Mock**:
   - Endpoint: `POST /api/v1/telemetry/ambulance`
   - Simulates continuous movement across GPS coordinates along emergency route vectors.
2. **Junction RFID & Passage Event Mock**:
   - Endpoint: `POST /api/v1/junctions/{junction_id}/rfid`
   - Emulates RC522 tag reads to trigger priority state machine transitions.
3. **Chaos / Failure Simulation**:
   - Emulate HTTP 500, network timeouts, and malformed sensor schemas to verify client recovery logic.

---

## 3. Strict Architectural Boundary

> [!IMPORTANT]
> Beeceptor is strictly a **development and testing tool**.  
> It must never replace the live FastAPI backend, SQLite database, or physical ESP32 microcontrollers in the final operational system.

---

## 4. Directory Structure (Reserved)

Future additions to this directory:
- `mock_rules.json`: Exported Beeceptor routing rules.
- `sample_payloads/`: Test JSON fixtures matching `docs/integration-contract.md`.
- `mock_runner.sh`: Test harness script to stream telemetry to Beeceptor endpoints.
