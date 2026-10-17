-- AttendHub: lock the database down. Run AFTER schema.sql, in Supabase SQL Editor.
--
-- Why: the frontend ships the Supabase ANON key. Without Row Level Security, anyone who
-- opens the browser dev tools could use that key to read tables directly (including
-- questions.correct_answer). Enabling RLS with NO policies blocks all direct access
-- from the anon/authenticated roles.
-- The Express backend uses the SERVICE ROLE key, which bypasses RLS, so the app still works.

alter table users          enable row level security;
alter table class_sections enable row level security;
alter table students       enable row level security;
alter table teachers       enable row level security;
alter table subjects       enable row level security;
alter table class_sessions enable row level security;
alter table attendance     enable row level security;
alter table tests          enable row level security;
alter table questions      enable row level security;
alter table test_sessions  enable row level security;
alter table answers        enable row level security;
alter table results        enable row level security;
