const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { unwrap } = require('../utils/db');
const generateCode = require('../utils/generateCode');
const { getStudentByUser } = require('./studentService');

// Sessions whose time ran out are marked 'expired' (also run by a timer in server.js)
async function expireOldSessions() {
  await supabase
    .from('class_sessions')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('expiry_time', new Date().toISOString());
}

// CR starts attendance
async function startSession(user, body) {
  const { subject_id, section_id, session_date } = body;
  const minutes = Number(body.minutes);

  if (!subject_id || !section_id) throw new AppError(400, 'Select a subject and a section');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(session_date || '')) throw new AppError(400, 'Select a valid date');
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) throw new AppError(400, 'Code validity must be 1 to 60 minutes');

  const cr = await getStudentByUser(user.id);
  if (cr.section_id !== section_id) throw new AppError(403, 'You can only start attendance for your own class');

  await expireOldSessions();
  const open = unwrap(
    await supabase
      .from('class_sessions')
      .select('id')
      .eq('cr_id', cr.id)
      .eq('status', 'active')
      .gt('expiry_time', new Date().toISOString())
      .limit(1)
  );
  if (open.length) throw new AppError(409, 'You already have an active session. Stop it first.');

  const expiry_time = new Date(Date.now() + minutes * 60000).toISOString();

  // The DB refuses two active sessions with the same code (unique index), so retry with a new code
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('class_sessions')
      .insert({ cr_id: cr.id, subject_id, section_id, session_date, session_code: generateCode(), expiry_time })
      .select()
      .single();
    if (!error) return data;
    if (error.code !== '23505') unwrap({ data: null, error });
  }
  throw new AppError(500, 'Could not generate a unique code. Try again.');
}

// A CR may only touch their own sessions. Teacher/admin may view any.
async function getSessionForUser(user, sessionId) {
  const session = unwrap(
    await supabase.from('class_sessions').select('*, subjects(name), class_sections(name)').eq('id', sessionId).maybeSingle()
  );
  if (!session) throw new AppError(404, 'Session not found');
  if (user.role === 'cr') {
    const cr = await getStudentByUser(user.id);
    if (session.cr_id !== cr.id) throw new AppError(403, 'This is not your session');
  }
  return session;
}

async function stopSession(user, sessionId) {
  const session = await getSessionForUser(user, sessionId);
  if (session.status !== 'active') throw new AppError(409, 'Session is already closed');
  unwrap(await supabase.from('class_sessions').update({ status: 'closed' }).eq('id', session.id));
  return { ok: true };
}

// Live list for the CR screen (and the CSV export)
async function getSessionAttendance(user, sessionId) {
  const session = await getSessionForUser(user, sessionId);

  const rows = unwrap(
    await supabase
      .from('attendance')
      .select('student_id, marked_time, students(roll_number, users(full_name))')
      .eq('session_id', sessionId)
      .order('marked_time')
  );
  const roster = unwrap(
    await supabase
      .from('students')
      .select('id, roll_number, users(full_name)')
      .eq('section_id', session.section_id)
      .order('roll_number')
  );

  const present = rows.map((r) => ({
    roll_number: r.students.roll_number,
    full_name: r.students.users.full_name,
    marked_time: r.marked_time,
  }));
  const presentIds = new Set(rows.map((r) => r.student_id));
  const absent = roster
    .filter((s) => !presentIds.has(s.id))
    .map((s) => ({ roll_number: s.roll_number, full_name: s.users.full_name }));

  return { session, present, absent, total: roster.length };
}

// Student marks attendance: roll number + session code
async function markAttendance(user, body) {
  const roll = String(body.roll_number || '').trim();
  const code = String(body.session_code || '').trim().toUpperCase();
  if (!roll || code.length < 4) throw new AppError(400, 'Enter your roll number and the session code');

  // 1. student exists and the roll number is THEIR roll number
  const student = await getStudentByUser(user.id);
  if (student.roll_number.toLowerCase() !== roll.toLowerCase()) {
    throw new AppError(403, 'This roll number does not match your account');
  }

  // 2. an active session with this code exists and has not expired
  const session = unwrap(
    await supabase
      .from('class_sessions')
      .select('id, subject_id, section_id, session_date, expiry_time, subjects(name)')
      .eq('session_code', code)
      .eq('status', 'active')
      .maybeSingle()
  );
  if (!session) throw new AppError(400, 'Invalid or expired session code');
  if (new Date(session.expiry_time).getTime() <= Date.now()) {
    await supabase.from('class_sessions').update({ status: 'expired' }).eq('id', session.id);
    throw new AppError(400, 'Invalid or expired session code');
  }

  // 3. the session is for this student's class
  if (session.section_id !== student.section_id) throw new AppError(403, 'This code is not for your class');

  // 4. save. UNIQUE(session_id, student_id) in the database blocks duplicates even in a race.
  const { data, error } = await supabase
    .from('attendance')
    .insert({
      session_id: session.id,
      student_id: student.id,
      subject_id: session.subject_id,
      attendance_date: session.session_date,
      status: 'present',
    })
    .select('marked_time')
    .single();
  if (error && error.code === '23505') throw new AppError(409, 'Attendance already marked for this session');
  unwrap({ data, error });

  return { subject: session.subjects.name, marked_time: data.marked_time };
}

module.exports = { expireOldSessions, startSession, stopSession, getSessionAttendance, markAttendance };
