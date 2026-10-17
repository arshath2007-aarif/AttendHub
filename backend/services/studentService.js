const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { unwrap, fetchAll } = require('../utils/db');
const { todayStr } = require('../utils/time');
const testService = require('./testService');

// Every student/CR is a row in `students`. This finds the row for the logged-in user.
async function getStudentByUser(userId) {
  const data = unwrap(
    await supabase.from('students').select('id, roll_number, section_id, is_cr').eq('user_id', userId).maybeSingle()
  );
  if (!data) throw new AppError(403, 'No student record is linked to this account');
  return data;
}

// One record per class session of the student's section: present / absent / pending
async function getRecords(student) {
  const sessions = await fetchAll(() =>
    supabase
      .from('class_sessions')
      .select('id, session_date, status, expiry_time, start_time, subjects(name)')
      .eq('section_id', student.section_id)
      .order('start_time', { ascending: false })
  );
  const marks = await fetchAll(() =>
    supabase.from('attendance').select('session_id, marked_time').eq('student_id', student.id).order('marked_time')
  );
  const markedAt = new Map(marks.map((m) => [m.session_id, m.marked_time]));
  const now = Date.now();

  return sessions.map((s) => {
    const marked = markedAt.get(s.id);
    const stillOpen = s.status === 'active' && new Date(s.expiry_time).getTime() > now;
    return {
      date: s.session_date,
      subject: s.subjects?.name || '—',
      marked_time: marked || null,
      status: marked ? 'present' : stillOpen ? 'pending' : 'absent',
    };
  });
}

async function getAttendance(userId) {
  const student = await getStudentByUser(userId);
  return { records: await getRecords(student) };
}

async function getDashboard(userId) {
  const student = await getStudentByUser(userId);
  const records = await getRecords(student);

  const counted = records.filter((r) => r.status !== 'pending');
  const attended = counted.filter((r) => r.status === 'present').length;
  const total = counted.length;
  const percentage = total ? Math.round((attended / total) * 100) : 100;

  // average of released results, as a percentage
  const results = unwrap(
    await supabase
      .from('results')
      .select('marks_obtained, total_marks, tests!inner(results_released)')
      .eq('student_id', student.id)
      .eq('tests.results_released', true)
  );
  const scored = results.filter((r) => r.total_marks > 0);
  const average_score = scored.length
    ? Math.round(scored.reduce((sum, r) => sum + (r.marks_obtained / r.total_marks) * 100, 0) / scored.length)
    : null;

  const tests = await testService.listForStudent(student);
  const active_tests = tests
    .filter((t) => t.status === 'active')
    .map((t) => ({ id: t.id, name: t.name, subject: t.subject, expiry_time: t.expiry_time, in_progress: t.in_progress }));

  return {
    attendance: { percentage, attended, missed: total - attended, total },
    average_score,
    today: records.filter((r) => r.date === todayStr()).map((r) => ({ subject: r.subject, status: r.status })),
    active_tests,
    server_time: new Date().toISOString(),
  };
}

module.exports = { getStudentByUser, getRecords, getAttendance, getDashboard };
