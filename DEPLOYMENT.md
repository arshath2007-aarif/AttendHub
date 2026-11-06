# AttendHub — Deployment Guide

This guide provides end-to-end instructions for deploying AttendHub to production.

---

## 🏗 Architecture Overview

| Component | Technology | Recommended Host |
|---|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS v4, Lucide | Vercel / Netlify or served via Express |
| **Backend** | Node.js, Express, Helmet, CORS, Rate-Limiting | Render / Railway / Docker VPS |
| **Database & Auth** | PostgreSQL, Supabase Auth, Row-Level Security (RLS) | Supabase (Managed Cloud) |

---

## 1. Database Setup (Supabase)

1. Create an account and new project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard:
   - Run the contents of [`database/schema.sql`](./database/schema.sql).
   - Run the contents of [`database/rls.sql`](./database/rls.sql) to enable Row Level Security.
3. Go to **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **Project API Keys → `anon` (public)** (used by Frontend)
   - **Project API Keys → `service_role` (secret)** (used by Backend **only**, never expose this to clients)

---

## 2. Deployment Options

You can deploy AttendHub using either **Option A (Unified Single Service)** or **Option B (Decoupled Services)**.

---

### Option A: Unified Service on Render (Recommended for Simplicity & Free Tier)

In this mode, the Express backend serves the Vite-built React frontend, requiring only **one** web service and eliminating CORS headaches.

1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/):
   - Click **New +** → **Blueprint** (or **Web Service**).
   - Select your repository (`AttendHub`).
   - If using Blueprint, Render automatically detects [`render.yaml`](./render.yaml).
   - If creating manually as a **Web Service**:
     - **Runtime:** `Node`
     - **Build Command:** `npm run build`
     - **Start Command:** `npm start`
     - **Health Check Path:** `/api/health`
3. Configure Environment Variables in Render:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `SERVE_FRONTEND` | `true` |
   | `SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase `service_role` secret key |
   | `TZ_NAME` | `Asia/Kolkata` (or your local timezone) |
   | `CLIENT_URL` | `*` |
4. Click **Deploy**. AttendHub will build both frontend and backend and launch at `https://<your-service>.onrender.com`.

---

### Option B: Decoupled (Vercel Frontend + Render/Railway Backend)

#### B.1 Backend Deployment (Render or Railway)
1. In Render / Railway, create a new Web Service from your GitHub repo.
2. Set Root Directory to `backend` (or leave as root and use `npm --prefix backend start`).
3. Set Build Command: `npm install --omit=dev`
4. Set Start Command: `node server.js`
5. Set Environment Variables:
   - `PORT`: `5000` (or host assigned)
   - `SUPABASE_URL`: `https://<your-project>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<your-service-role-key>`
   - `CLIENT_URL`: `https://your-frontend.vercel.app` (your frontend Vercel URL)
   - `TZ_NAME`: `Asia/Kolkata`
6. Note your backend URL (e.g., `https://attendhub-api.onrender.com`).

#### B.2 Frontend Deployment (Vercel)
1. In [Vercel](https://vercel.com/), click **Add New** → **Project** and import your GitHub repo.
2. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`: `https://<your-project>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `<your-anon-key>`
   - `VITE_API_URL`: `https://attendhub-api.onrender.com/api` (URL of your backend)
4. Click **Deploy**. Vercel will build the frontend with SPA rewrites configured via [`frontend/vercel.json`](./frontend/vercel.json).

---

### Option C: Docker Container Deployment (Any Cloud / VPS / Railway)

1. Ensure Docker is installed on your host or server.
2. Create `.env` at root with:
   ```env
   SUPABASE_URL=https://<your-project>.supabase.co
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   PORT=5000
   TZ_NAME=Asia/Kolkata
   ```
3. Run with Docker Compose:
   ```bash
   docker compose up -d --build
   ```
4. Access the application at `http://localhost:5000`.

---

## 3. Database Seeding (Demo Accounts & Tests)

Once the backend is configured with the Supabase Service Role Key:

```bash
cd backend
# Make sure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SEED_PASSWORD are set in backend/.env
npm run seed
```

This creates demo accounts (all with password = `SEED_PASSWORD`):
- **Admin:** `admin@example.com`
- **Teacher:** `teacher@example.com`
- **Class Representative (CR):** `22CS001` (email: `22cs001@example.com`)
- **Students:** `22CS002` through `22CS010`
- **Sample Test:** "Java Unit Test 1" (active, published, with 5 graded questions)

---

## 4. Environment Variables Reference

### Frontend (`frontend/.env`)
| Variable | Description | Example |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anonymous key | `eyJhbGciOi...` |
| `VITE_API_URL` | Backend API base URL | `https://api.domain.com/api` or `/api` |

### Backend (`backend/.env`)
| Variable | Description | Example |
|---|---|---|
| `PORT` | HTTP port | `5000` |
| `CLIENT_URL` | Allowed CORS origins (comma-separated or `*`) | `https://app.vercel.app` |
| `SUPABASE_URL` | Supabase Project URL | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret service role key | `eyJhbGciOi...` |
| `TZ_NAME` | Default timezone for date parsing | `Asia/Kolkata` |
| `SERVE_FRONTEND` | Whether Express serves frontend from `../frontend/dist` | `true` |
| `SEED_PASSWORD` | Password assigned to demo users during seed | `YourSecret123!` |

---

## 5. Deployment Verification Checklist

- [x] Frontend builds with zero errors: `npm --prefix frontend run build`
- [x] Backend syntax verified: `node -c backend/server.js`
- [x] SPA routing configured (`vercel.json` and `_redirects`)
- [x] Multi-origin and wildcard CORS enabled on backend
- [x] Express static serving fallback configured for SPA routes
- [x] Background auto-submit & session expiry job active (every 30s)
- [x] Health check endpoint operational (`GET /api/health`)
- [x] Multi-stage `Dockerfile` and `docker-compose.yml` verified
- [x] `render.yaml` and `railway.json` blueprint configs added
