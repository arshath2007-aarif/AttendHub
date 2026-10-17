# AttendHub — Backend (Node.js + Express + Supabase)

## Setup
1. Create a project at supabase.com.
2. In **SQL Editor** run `database/schema.sql`, then `database/rls.sql`.
3. In **Project Settings → API** copy the Project URL, the `anon` key (for the frontend) and the `service_role` key (for the backend only).
4. Backend:
   ```bash
   cd backend
   cp .env.example .env     # fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_PASSWORD
   npm install
   npm run seed             # demo accounts + a Java test
   npm run dev              # http://localhost:5000/api/health
   ```
5. Frontend `.env`: `VITE_API_URL=http://localhost:5000/api`, plus the Supabase URL and **anon** key.

## Demo accounts (password = your SEED_PASSWORD)
| Role | Login |
|---|---|
| Admin | admin@example.com |
| Teacher | teacher@example.com |
| CR | 22CS001 |
| Students | 22CS002 to 22CS010 |

## Demo script
1. Log in as **22CS001** (CR) → pick Java + CSE-A → *Start & generate code*.
2. In another browser/phone log in as **22CS002** → *Attendance* → enter roll no. + code. The CR screen updates within 5 seconds.
3. Log in as teacher → *Tests* → monitor **Java Unit Test 1**.
4. As a student → *Tests* → Start → answer → Submit. The teacher monitor shows login time, status, time spent and marks. Teacher clicks *Release results*.

## Structure
```
backend/
├── server.js            app setup + 30s background job
├── config/supabase.js   service-role client
├── middleware/          auth (JWT), requireRole, validateId, rateLimit, errorHandler
├── routes/              URL -> controller (+ which roles may call it)
├── controllers/         read request, call a service, send response
├── services/            the real logic: attendance, tests, grading, reports
├── utils/               codes, CSV, time, db helpers
└── scripts/seed.js      demo data
```

## Security decisions (good viva answers)
- **Backend decides everything.** JWT verified on every request; the role comes from the `users` table, not the browser.
- **Server time is authoritative.** Test deadline = `min(login + duration, test expiry)`, stored in the DB and compared with the server clock. The browser timer only displays.
- **Marks cannot be edited.** The browser sends answers only; `gradingService` computes marks from `correct_answer`, which is never sent to students.
- **Duplicates blocked twice:** a check in code and `UNIQUE(session_id, student_id)` / `UNIQUE(test_id, student_id)` in the database. Submit uses `WHERE status='in_progress'` so only one request can win.
- **Another student's data is unreachable:** every session lookup filters by the logged-in student's id.
- **Hidden until released:** students get `marks_obtained = null` until the teacher releases results.
- **Brute-force protection:** attendance marking is rate-limited (8/min per user), session codes are short-lived and random.
- **Auto-submit without the browser:** a job every 30 s closes sessions past their deadline.
- **RLS enabled with no policies,** so the public anon key cannot read tables directly.

## Known limits
- Hotspot/Wi-Fi presence is not detected (browsers cannot do it); the session code is the real check.
- Roll-number login reveals whether a roll number exists. It is rate-limited; for production use a generic message.
