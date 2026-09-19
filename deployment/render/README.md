# Deploying EMERGE-X to Render (render.com)

EMERGE-X is fully configured for deployment on Render. You can deploy it using **Method A (Blueprint — Recommended)**, **Method B (All-in-One Docker Container)**, or **Method C (Manual Setup)**.

---

## Method A: 1-Click Render Blueprint (Recommended)

Render Blueprints automatically set up both the **FastAPI Backend Web Service** and the **React Vite Static Site** in a single operation using the included [`render.yaml`](../../render.yaml).

### Steps:
1. Push this repository to **GitHub** or **GitLab**.
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** in the top navigation bar, and select **Blueprint**.
4. Connect your GitHub/GitLab repository.
5. Render will automatically detect [`render.yaml`](../../render.yaml) and present two services to create:
   - **`emerge-x-backend`** (Python Web Service)
   - **`emerge-x-frontend`** (Static Site)
6. Click **Apply**.
7. Render will build both services:
   - The backend runs `pip install -r backend/requirements.txt` and starts Uvicorn.
   - The frontend compiles with `npm run build` and links to the backend URL automatically.

---

## Method B: Single-Service All-in-One Docker Deployment

If you want to run the entire application on Render's **Free Tier** using a **single service** (saving service limits):

### Steps:
1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Connect your repository.
4. Select **Docker** as the runtime (Render will automatically detect the root [`Dockerfile`](../../Dockerfile)).
5. Name: `emerge-x-fullstack`.
6. Environment variables (optional):
   - `PORT`: `8000` (or leave default, Render sets this dynamically).
   - `PROJECT_NAME`: `EMERGE-X`.
7. Click **Deploy Web Service**.

> In this mode, the multi-stage Docker build automatically compiles the React frontend into `frontend/dist` and FastAPI serves both the REST API at `/api` and the interactive dashboards at `/`.

---

## Method C: Manual Configuration (Without Blueprint)

If you prefer to configure services manually in the Render dashboard:

### 1. Deploy the Backend (Web Service)
- **Type**: Web Service
- **Name**: `emerge-x-backend`
- **Language**: `Python`
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/health`
- **Environment Variables**:
  - `PYTHON_VERSION`: `3.11.9`
  - `CORS_ORIGINS`: `*` (or your frontend Render URL)

### 2. Deploy the Frontend (Static Site)
- **Type**: Static Site
- **Name**: `emerge-x-frontend`
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Rewrite Rules** (Under *Redirects/Rewrites*):
  - **Source**: `/*`
  - **Destination**: `/index.html`
  - **Action**: `Rewrite`
- **Environment Variables**:
  - `VITE_BACKEND_URL`: `https://emerge-x-backend.onrender.com` (use your actual backend Render URL)

---

## Verification After Deployment

Once deployed, verify the endpoints:
1. **Health Check**: `https://<your-backend-url>/health` → should return `{"status":"ok","service":"EMERGE-X backend"}`.
2. **Interactive API Docs**: `https://<your-backend-url>/docs` → Swagger UI.
3. **Commander Dashboard**: `https://<your-frontend-url>/` → Live Leaflet map, corridor state, and fleet tracking.
4. **Driver Dashboard**: Log in with Driver credentials → Navigation map, destination selector, and mission HUD.
