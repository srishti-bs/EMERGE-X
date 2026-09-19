# EMERGE-X: Deployment Strategy & Roadmap

> [!WARNING]
> **PHASE NOTICE: DO NOT DEPLOY NOW**  
> This document details the production and staging cloud deployment roadmap for future milestones. No cloud resources, database clusters, or public domains should be provisioned during the current initial architecture phase.

---

## 1. Future Render Cloud Deployment Overview

Render (`render.com`) is designated as the target hosting platform for cloud-accessible services:

1. **Backend Web Service (`emerge-x-api`)**
   - **Environment**: Python 3.11+
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Protocols**: Exposes REST endpoints and WebSocket channels (`/ws/live-state`).

2. **Frontend Static Site / Web Service (`emerge-x-web`)**
   - **Environment**: Node.js 20+
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Routing**: Single Page Application rewrite rule (`/* -> /index.html`).

3. **Database (Persistence)**
   - **Initial Stage**: Local SQLite (`emerge_x.db`) embedded in the backend container for lightweight, fast hackathon prototyping.
   - **Scale Stage**: Managed PostgreSQL instance on Render if persistent relational transactions across container restarts become required.

---

## 2. Local Computer Vision & Hardware Operational Constraints

> [!IMPORTANT]
> **Hardware & Camera Edge Constraint**  
> The physical prototype utilizes:
> - Direct USB connection to the webcam mounted over the miniature intersection.
> - Local serial/Wi-Fi communication with the ESP32 microcontrollers on the local subnet.
> 
> Because cloud containers on Render cannot directly access local laptop USB peripherals without complex WebRTC/RTSP tunneling:
> 1. The OpenCV and YOLO detection loops will execute locally on the prototype laptop.
> 2. The local laptop's detection process will post structured traffic density metrics upstream to either the local backend or the cloud backend over secure HTTPS.
> 3. ESP32 devices will communicate with the backend either via local IP (when running entirely local) or via public HTTPS/WSS (when backend is deployed on Render).

---

## 3. `.xyz` Custom Domain Configuration Roadmap

Once the backend and frontend services are deployed on Render:
1. **Acquisition**: Register an appropriate `.xyz` domain (e.g., `emerge-x.xyz`).
2. **DNS Records**:
   - `CNAME` for root / apex: Points to Render static site or web service.
   - `CNAME` for `api.emerge-x.xyz`: Points to Render backend service.
3. **SSL/TLS Certificates**: Render provides automatic Let's Encrypt certificates for the configured `.xyz` domains.

---

## 4. Pre-Deployment Verification Checklist

Before initiating production deployment in future phases:
- [ ] Backend passes all automated tests in `backend/tests/`.
- [ ] Database migrations execute cleanly without data loss.
- [ ] WebSocket connection handling supports reconnection logic for mobile clients.
- [ ] Environment variables (`BACKEND_URL`, `DATABASE_URL`, `CORS_ORIGINS`) are mapped in Render dashboard.
- [ ] Simulated telemetry runs without memory leaks or unhandled exceptions.
