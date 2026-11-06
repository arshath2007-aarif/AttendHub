# AttendHub

> Modern classroom attendance and timed test management platform built with React, Vite, Node.js, Express, and Supabase.

---

## 🌟 Highlights

- **Fast Code-Based Attendance:** Class Representatives (CR) create short-lived session codes; students enter their code and roll number to mark attendance in seconds.
- **Fair Timed Tests:** Server-authoritative timer prevents local browser clock manipulation. Tests auto-submit when the deadline expires.
- **Tamper-Proof Grading:** Questions, options, and student answers are handled securely. Answer keys and scores are never sent to students until officially released.
- **Live Monitoring & Analytics:** Real-time dashboards for CRs, teachers, and admins with attendance percentages, subject breakdown charts, and low-attendance warnings.
- **Export Ready:** One-click CSV exports for attendance records and test scores.

---

## 📁 Repository Structure

```
AttendHub/
├── backend/               # Express.js REST API + background jobs
│   ├── config/            # Supabase service role client
│   ├── controllers/       # Request handlers
│   ├── middleware/        # JWT auth, role validation, rate limiting
│   ├── routes/            # Route declarations
│   ├── services/          # Business logic (attendance, tests, grading)
│   ├── utils/             # Helper utilities
│   └── scripts/           # Database seed script
├── frontend/              # React 18 + Vite SPA with Tailwind CSS
│   ├── public/            # Static assets and SPA _redirects
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom hooks (auth, countdown, fetch)
│   │   ├── layouts/       # Dashboard and page layouts
│   │   ├── pages/         # Role-based pages (Student, CR, Admin)
│   │   └── services/      # API client and Supabase auth client
├── database/
│   ├── schema.sql         # PostgreSQL schema definition
│   └── rls.sql            # Supabase Row Level Security policies
├── Dockerfile             # Multi-stage production container build
├── docker-compose.yml     # Container orchestration
├── render.yaml            # Render.com blueprint deployment
├── railway.json           # Railway.app configuration
├── DEPLOYMENT.md          # Complete deployment instructions
└── package.json           # Root monorepo build & start scripts
```

---

## 🚀 Quick Start (Local Development)

### 1. Database Setup
1. Create a project at [supabase.com](https://supabase.com).
2. Run `database/schema.sql` in the Supabase SQL Editor.
3. Run `database/rls.sql` to lock down tables.
4. Copy your project URL, `anon` key, and `service_role` key from **Project Settings → API**.

### 2. Environment Variables
- In `backend/.env`:
  ```env
  PORT=5000
  CLIENT_URL=http://localhost:5173
  SUPABASE_URL=https://<your-project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
  TZ_NAME=Asia/Kolkata
  SEED_PASSWORD=Password123!
  ```
- In `frontend/.env`:
  ```env
  VITE_SUPABASE_URL=https://<your-project>.supabase.co
  VITE_SUPABASE_ANON_KEY=<your-anon-key>
  VITE_API_URL=http://localhost:5000/api
  ```

### 3. Install Dependencies & Seed Demo Data
```bash
# Install dependencies for both frontend and backend
npm run install:all

# Seed initial database records (Admin, Teacher, CR, Students, Sample test)
npm run seed
```

### 4. Run Development Servers
- Start backend: `npm run dev:backend` (runs on http://localhost:5000)
- Start frontend: `npm run dev:frontend` (runs on http://localhost:5173)

---

## 🚢 Production Deployment

AttendHub is fully configured for zero-friction cloud deployment.

Detailed instructions for:
- **Render (Full-Stack 1-Click)**
- **Vercel (Frontend) + Render/Railway (Backend)**
- **Docker & Docker Compose (VPS / Cloud Run)**

👉 **See the complete guide in [DEPLOYMENT.md](./DEPLOYMENT.md).**
