# Sponsor Integration: n8n

> **Role: Asynchronous Workflow Automation & Emergency Notification Webhooks**  
> *Status: Scaffold Reserved for Future Workflow Configurations*

---

## 1. Integration Purpose

n8n is an extendable workflow automation platform utilized in EMERGE-X to handle asynchronous notifications, external alerting, and post-incident reporting when triggered by backend webhooks.

---

## 2. Strict Architectural Boundary

> [!CAUTION]
> **n8n Must NOT Become the Core Decision Engine**  
> The following core functionalities **must remain strictly inside the FastAPI Python backend**:
> - Dynamic graph routing (Dijkstra / A* algorithms)
> - Signal safety interlocking and clearance intervals
> - GPS coordinate filtering and geofencing
> - YOLO computer vision inference and density calculations
> - Emergency priority arbitration and corridor state machines
> 
> n8n acts **only as an external subscriber** to completed backend state events.

---

## 3. Planned Workflows

1. **Hospital Emergency Inbound Alert**:
   - Trigger: Backend fires webhook when an ambulance starts a critical run.
   - Action: Sends priority alert to hospital triage dashboard / notification channel with vehicle ID and ETA.
2. **Commander Incident Notification**:
   - Trigger: Backend registers persistent road blockage or accident from computer vision.
   - Action: Broadcasts incident alert to municipal response teams.
3. **Post-Trip Summary & Audit Logging**:
   - Trigger: Emergency run status updates to `COMPLETED`.
   - Action: Compiles route travel time, green corridor efficiency, and logs audit record.

---

## 4. Directory Structure (Reserved)

Future additions to this directory:
- `workflows/`: Exported JSON workflow definitions ready for n8n import.
- `webhooks.md`: Webhook payload formats and endpoint documentation.
