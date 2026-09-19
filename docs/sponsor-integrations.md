# EMERGE-X: Sponsor Technology Integrations

This document defines the architectural roles, boundaries, and implementation guidelines for sponsor technologies leveraged in the EMERGE-X project.

---

## 1. Beeceptor

### Architectural Role
**API Mocking, Contract Testing & Hardware Simulation Bridge**

### Scope & Boundaries
- **Development & Testing Only**: Beeceptor is designated for rapid prototyping, isolated endpoint testing, and CI/CD mock validation.
- **Hardware Decoupling**: Allows software teams to build and test backend telemetry receivers and frontend dashboards prior to flashing microcontrollers.
- **Not a Replacement**: Beeceptor **must not** replace the real FastAPI backend or physical ESP32 microcontrollers in the final operational topology.

### Future Planned Use Cases
1. **ESP32 #1 Telemetry Simulation**: Emulate high-frequency NEO-6M GPS data feeds without requiring physical movement of prototype vehicles.
2. **ESP32 #2 RFID/IR Event Mocking**: Test junction corridor clearance and tag identification before deploying physical RFID antennas.
3. **Fault Injection & Chaos Testing**: Simulate network drops, delayed packet arrival, and malformed sensor payloads to test backend resilience.
4. **Endpoint Mocking**: Mock backend endpoints for frontend UI development during parallel sprints.

### Reserved Directory
`integrations/beeceptor/`  
Reserved for mock rules, curl scripts, mock payload collections, and integration guides.

---

## 2. n8n

### Architectural Role
**Event-Driven Workflow Automation, Triage Alerts & Post-Trip Logging**

### Scope & Boundaries
- **Strict Boundary**: n8n **must NOT become the core decision engine**.
- The core decision systems—including graph-based Dijkstra/A* routing, signal safety interlocking, emergency green corridor state machines, YOLO detection, and GPS geofencing—**remain strictly inside the FastAPI backend**.
- n8n acts as an asynchronous subscriber to backend webhook events.

### Future Planned Use Cases
1. **Emergency Activation Broadcast**: Trigger SMS, email, or Slack notifications to municipal dispatchers when `EMERGENCY_ACTIVATED` is triggered.
2. **Hospital Triage Alerts**: Automatically transmit incoming patient vitals and ETA countdowns to emergency room charge nurses.
3. **Incident Escalation**: Notify highway patrols when YOLO detects persistent vehicular obstructions or accidents.
4. **Post-Emergency Audit Reports**: Compile trip durations, corridor clearance efficiency, and signal override logs into structured PDF/Google Sheets summaries.

### Reserved Directory
`integrations/n8n/`  
Reserved for exported workflow JSON definitions, webhook schema references, and environment setup instructions.

---

## 3. Render

### Architectural Role
**Cloud Deployment & Staging Platform**

### Scope & Boundaries
- Cloud hosting platform for public access to the EMERGE-X platform.
- **Components Targetable for Cloud Deployment**:
  - FastAPI backend web service.
  - React/Vite frontend static site or web service.
  - PostgreSQL database instance (if migration from SQLite is required in future production scaling).
- **Edge Vision Limitation**: The physical USB webcam + local OpenCV/YOLO inference loop will remain hosted on the prototype laptop unless a high-throughput WebRTC or RTSP video streaming pipeline is explicitly architected.

### Reserved Directory
`deployment/render/`  
Reserved for `render.yaml` infrastructure-as-code manifests, Dockerfiles, and environment variable references.

---

## 4. `.xyz` Domain

### Architectural Role
**Custom Top-Level Domain & Brand Presence**

### Scope & Boundaries
- Reserved for future production staging (e.g., `https://emerge-x.xyz`).
- **Phase Status**: Do not purchase, register, or configure DNS records during this initial setup phase.
- Custom domain mapping, SSL/TLS certificate generation via Let's Encrypt, and DNS routing will be configured in Render after deployment readiness.

---

## 5. CodeCrafters

### Architectural Role
**Internal Engineering Reference & Skill Development**

### Scope & Boundaries
- **NOT a Runtime Dependency**: CodeCrafters is not an API, SDK, service, or library.
- It is strictly an educational and reference resource utilized by developers to deepen understanding of systems programming (e.g., building HTTP servers, Redis-like pub/sub engines, or protocol parsers from scratch).
- It will **not** be included in `requirements.txt`, `package.json`, or system architecture diagrams.

---

## 6. Trace Commons

### Architectural Role
**Reserved Integration Placeholder**

### Scope & Boundaries
- Requirements and specifications for Trace Commons are currently pending verification.
- **Policy**: Do not invent or assume requirements, APIs, or integration patterns.
- Once official guidelines and technical requirements are confirmed by the team/hackathon organizers, formal integration designs will be added to this document.
