-- AttendHub database schema (Supabase PostgreSQL)
-- Run this in Supabase Dashboard -> SQL Editor.

create extension if not exists "pgcrypto";

-- Reusable trigger: keeps updated_at current on every UPDATE
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ENUM-like types
create type user_role as enum ('student', 'cr', 'teacher', 'admin');
create type attendance_status as enum ('present', 'absent');
create type session_status as enum ('active', 'closed', 'expired');
create type question_type as enum ('mcq', 'true_false', 'short_answer');  -- add more later
create type test_session_status as enum ('in_progress', 'submitted', 'auto_submitted');

-- USERS: one row per Supabase Auth account (id = auth.users.id)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role user_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table class_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- e.g. "CSE-A"
  year int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, year)
);

create table students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references users(id) on delete cascade,
  roll_number text unique not null,
  section_id uuid not null references class_sections(id),
  is_cr boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_students_section on students(section_id);

create table teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references users(id) on delete cascade,
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- e.g. "CS301"
  name text not null,                 -- e.g. "Java"
  teacher_id uuid references teachers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ATTENDANCE SESSIONS (started by CR)
create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  cr_id uuid not null references students(id),
  subject_id uuid not null references subjects(id),
  section_id uuid not null references class_sections(id),
  session_date date not null default current_date,
  session_code text not null,         -- short temporary code, e.g. "K7P2QX"
  start_time timestamptz not null default now(),
  expiry_time timestamptz not null,
  status session_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_class_sessions_lookup on class_sessions(session_code, status);
create index idx_class_sessions_section_date on class_sessions(section_id, session_date);
-- Only one active code at a time can use the same value
create unique index uq_active_session_code on class_sessions(session_code) where status = 'active';

create table attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references class_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id),
  attendance_date date not null,
  marked_time timestamptz not null default now(),
  status attendance_status not null default 'present',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)     -- blocks duplicate attendance at DB level
);
create index idx_attendance_student on attendance(student_id, attendance_date);
create index idx_attendance_subject on attendance(subject_id, attendance_date);

-- TESTS
create table tests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject_id uuid not null references subjects(id),
  description text,
  created_by uuid not null references users(id),
  start_time timestamptz not null,
  expiry_time timestamptz not null,
  duration_minutes int not null check (duration_minutes > 0),
  total_marks int not null default 0,
  is_published boolean not null default false,
  results_released boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expiry_time > start_time)
);
create index idx_tests_subject on tests(subject_id);

create table questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id) on delete cascade,
  type question_type not null default 'mcq',
  question_text text not null,
  options jsonb,                      -- ["A","B","C","D"] for MCQ
  correct_answer text not null,       -- NEVER sent to students
  marks int not null default 1,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_questions_test on questions(test_id, position);

create table test_sessions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  login_time timestamptz not null default now(),
  deadline timestamptz not null,      -- min(login_time + duration, test expiry_time)
  logout_time timestamptz,
  submitted_time timestamptz,
  time_spent_seconds int,
  status test_session_status not null default 'in_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_id, student_id)        -- one attempt per student
);
create index idx_test_sessions_test on test_sessions(test_id, status);

create table answers (
  id uuid primary key default gen_random_uuid(),
  test_session_id uuid not null references test_sessions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  answer text,
  is_correct boolean,                 -- set by backend only
  marks_awarded int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_session_id, question_id)
);

create table results (
  id uuid primary key default gen_random_uuid(),
  test_session_id uuid unique not null references test_sessions(id) on delete cascade,
  test_id uuid not null references tests(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  marks_obtained int not null default 0,
  total_marks int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_results_student on results(student_id);

-- updated_at triggers
do $$
declare t text;
begin
  for t in select unnest(array[
    'users','class_sections','students','teachers','subjects','class_sessions',
    'attendance','tests','questions','test_sessions','answers','results'])
  loop
    execute format('create trigger trg_%I_updated before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- Realistic demo data
insert into class_sections (name, year) values ('CSE-A', 3);
insert into subjects (code, name) values ('CS301', 'Java'), ('CS302', 'DBMS'), ('CS303', 'Operating Systems');
