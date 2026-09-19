# EMERGE-X: Integrations Subsystem

> **Third-Party & Sponsor Technology Integration Hub**  
> *Sponsors: Beeceptor (API Mocking), n8n (Workflow Automation)*

---

## 1. Directory Overview

This subsystem maintains configuration templates, mock definitions, and workflow automations for external services integrated into EMERGE-X.

```
integrations/
├── beeceptor/    # Mock API rules, simulated endpoints, contract testing payloads
├── n8n/          # Workflow automation JSON definitions and webhook documentation
└── README.md     # Integrations overview and architectural boundaries
```

---

## 2. Sponsor Technology Boundaries

1. **Beeceptor**
   - **Role**: Contract mocking and isolated hardware simulation.
   - **Boundary**: Testing/development utility only. Does not replace the production FastAPI backend or physical microcontrollers.
2. **n8n**
   - **Role**: Asynchronous event-driven alerting, hospital ER notifications, and incident escalations.
   - **Boundary**: Strict notification/audit layer. Core decision engines (Dijkstra/A* routing, signal safety interlocking, priority calculations) **must not** be offloaded to n8n.
3. **Trace Commons**
   - Integration requirements are currently pending verification. No speculative designs are implemented.
4. **CodeCrafters**
   - Educational resource only; not a runtime dependency or architectural integration.
