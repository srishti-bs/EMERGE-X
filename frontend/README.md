# EMERGE-X: Frontend Subsystem

> **Real-Time Operational Dashboards**  
> *Stack: React / Vite / JavaScript / HTML / CSS*

---

## 1. Directory Overview

The `frontend` subsystem provides operational dashboards for emergency response personnel, traffic coordinators, and hospitals.

```
frontend/
├── src/
│   ├── components/
│   │   ├── LoginScreen.jsx            # Clean dark-mode authentication & role picker
│   │   ├── Sidebar.jsx                # Persistent role-based left navigation bar
│   │   ├── Header.jsx                 # Top status bar, system status, demo mode badge
│   │   ├── ActiveEmergencyCard.jsx    # Emergency ID, vehicle, status, destination, ETA
│   │   ├── AmbulanceLocationCard.jsx  # GPS coordinates, velocity, demo telemetry label
│   │   ├── RouteSchematic.jsx         # Visual centerpiece: MOVING EMERGENCY CORRIDOR (J1-J4)
│   │   ├── JunctionPriorityPanel.jsx  # Junction priority cards and selective priority notice
│   │   ├── PriorityCommandCard.jsx    # Priority control metrics (J2, AX-01, 30s, 45s)
│   │   ├── HospitalDestinationCard.jsx# Facility name, inbound vehicle, arrival ETA
│   │   └── DemoControls.jsx           # Demo Play, Next Step, Step pills, Reset controls
│   ├── pages/
│   │   ├── CommanderDashboard.jsx     # Overview, Active Emergencies, Routes & Junctions, Priority Control
│   │   ├── DriverDashboard.jsx        # My Mission, Route, Emergency Corridor
│   │   └── HospitalDashboard.jsx      # Overview, Incoming Ambulances, Emergency Details
│   ├── services/
│   │   ├── demoData.js                # Centralized demo dataset (Steps 1, 2, 3)
│   │   └── api.js                     # API client with health-check and demo fallback
│   ├── App.jsx                        # Layout shell, auth state, persistent sidebar
│   ├── index.css                      # Control-room dark design system
│   └── main.jsx                       # React entrypoint
├── index.html                         # HTML5 document shell with typography links
├── vite.config.js                     # Vite build and dev server config
├── package.json                       # Dependencies & scripts
└── README.md                          # Documentation
```

---

## 2. Authentication & Role Modules

### Demo Credentials (Prototype Access)

| Role | Username | Password | Access Module |
| :--- | :--- | :--- | :--- |
| **Commander** | `commander` | `emerge123` | Full dispatch control room, moving green corridor overview, priority control |
| **Driver** | `driver` | `emerge123` | High-contrast heads-up display, speed gauge, upcoming junction notice |
| **Hospital** | `hospital` | `emerge123` | Inbound emergency tracking, ETA countdown, emergency details |

Invalid credentials display a friendly error banner. Quick-select demo chips are provided for 1-click evaluation.

---

## 3. Persistent Sidebar Navigation

After login, the persistent left sidebar provides structured module access per role:

### 1. Commander Module
- **Overview**: Main presentation screen with the route (`J1 → J2 → J3 → J4`) as the visual centerpiece with `MOVING EMERGENCY CORRIDOR` label, active emergency card, ambulance location card, hospital destination, and demo controls.
- **Active Emergencies**: Clean tabular view of active missions (`E-001`, `AX-01`, `ACTIVE CRITICAL`, `City General Hospital`, ETA `8 min`).
- **Routes & Junctions**: Detailed route schematic and junction priority cards (`J1`–`J4`).
- **Priority Control**: Target junction (`J2`), vehicle (`AX-01`), state (`ACTIVE PRIORITY`), green window (`30s`), max hold (`45s`).

### 2. Driver Module
- **My Mission**: Clean HUD with velocity (`50 km/h`), `E-001`, `AX-01`, destination, and ETA.
- **Route**: `J1 → J2 → J3 → J4` with prominent `APPROACHING: J2` callout.
- **Emergency Corridor**: Current Priority: `J2`, Status: `ACTIVE`, Next Junction: `J3`. No unnecessary RFID or heading clutter.

### 3. Hospital Module
- **Overview**: Inbound ambulance (`AX-01`), emergency ID (`E-001`), arrival ETA (`8 min`), destination (`City General Hospital`).
- **Incoming Ambulances**: Clean table of inbound ambulances, emergency IDs, ETAs, and statuses.
- **Emergency Details**: Simple card showing `E-001`, `AX-01`, `8 min`, `City General Hospital`, `ACTIVE`. No clinical administration clutter.

---

## 4. Demo Mode & Presentation Controls

The dashboard is built to work **100% offline in DEMO MODE** without requiring physical ESP32 hardware:
- **Centralized Demo Module**: All scenario states are managed in `src/services/demoData.js`.
- **Demo Play**: Automatically cycles through the moving corridor steps every 3.5 seconds:
  - **Step 1**: `J1=COMPLETED`, `J2=ACTIVE_PRIORITY`, `J3=PREPARING`, `J4=NORMAL`
  - **Step 2**: `J1=COMPLETED`, `J2=COMPLETED`, `J3=ACTIVE_PRIORITY`, `J4=PREPARING`
  - **Step 3**: `J1=COMPLETED`, `J2=COMPLETED`, `J3=COMPLETED`, `J4=ACTIVE_PRIORITY`
- **Manual Stepping**: Use `NEXT STEP`, `RESET`, or jump directly to any step using the step pills.

---

## 5. Getting Started

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
npm run build
npm run preview
```

---

## 6. Terminology Standard
- **Selective Directional Emergency Corridor Priority**: Priority is granted strictly in the direction of emergency vehicle travel; conflicting cross-traffic approaches are locked in red. **Not all signals become green.**
