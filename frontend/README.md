# AttendHub — Frontend (React + Vite + Tailwind)

## Run locally
```bash
cd frontend
cp .env.example .env      # fill in your Supabase URL, anon key and API URL
npm install
npm run dev               # http://localhost:5173
```

## Push to GitHub
```bash
cd attendhub
git init
git add .
git commit -m "feat: AttendHub frontend"
git branch -M main
git remote add origin https://github.com/<your-username>/attendhub.git
git push -u origin main
```
`.env` is in `.gitignore`, so your keys are never pushed.

## API the frontend expects (build these in the Express backend)
Every route except `/auth/resolve` needs `Authorization: Bearer <supabase jwt>`.

| Method | Path | Who | Returns / does |
|---|---|---|---|
| POST | /auth/resolve `{identifier}` | public | `{email}` for a roll number |
| GET | /me | any | `{id, full_name, role, roll_number}` |
| GET | /student/dashboard | student | `{attendance:{percentage,attended,missed,total}, average_score, today:[{subject,status}], active_tests:[{id,name,subject,expiry_time,in_progress}], server_time}` |
| GET | /student/attendance | student | `{records:[{date,subject,marked_time,status}]}` |
| POST | /attendance/mark `{roll_number, session_code}` | student | validates, inserts, returns `{subject, marked_time}` |
| GET | /tests | student | tests with `status` (upcoming/active/expired/completed), `in_progress`, `marks_obtained` (only if released) |
| POST | /tests/:id/start | student | idempotent. `{test_session_id, test, questions (NO correct_answer), deadline, server_time, saved_answers}` |
| PUT | /test-sessions/:id/answer `{question_id, answer}` | student | saves one answer (rejects after deadline) |
| POST | /test-sessions/:id/submit `{auto}` | student | grades on server, `{status, marks_obtained, total_marks, results_released}` |
| GET | /cr/options | cr, teacher, admin | `{subjects, sections}` |
| GET | /cr/dashboard | cr | `{today:{present,absent}, active_tests, pending_submissions, active_session, server_time}` |
| POST | /sessions `{subject_id, section_id, session_date, minutes}` | cr | creates session + code |
| POST | /sessions/:id/stop | cr | closes session |
| GET | /sessions/:id/attendance | cr | `{present:[{roll_number,full_name,marked_time}], total}` |
| GET | /sessions/:id/export | cr | CSV |
| GET | /tests/manage | cr, teacher, admin | tests with `is_published`, `status`, `question_count` |
| POST | /tests | cr, teacher, admin | creates test + questions |
| PATCH | /tests/:id/publish `{is_published}` | cr, teacher, admin | |
| DELETE | /tests/:id | teacher, admin | |
| GET | /tests/:id/monitor | cr, teacher, admin | `{test, rows:[{full_name,roll_number,login_time,status,submitted_time,time_spent_seconds,marks_obtained}]}` |
| GET | /tests/:id/export | cr, teacher, admin | CSV |
| POST | /tests/:id/release | teacher, admin | releases results |
| GET | /reports/summary | teacher, admin | `{totals, attendance_by_subject, test_performance, low_attendance}` |
| GET | /reports/attendance/export | teacher, admin | CSV |

## Viva notes
- **Routing:** `App.jsx` groups routes by role; `ProtectedRoute` blocks other roles.
- **Auth:** `useAuth.jsx` signs in with Supabase, then loads `/me` to get the role.
- **Timer:** `useCountdown.js` is display-only. The backend decides expiry using its own clock.
- **Answers:** saved to the server on every click, so a refresh loses nothing.
