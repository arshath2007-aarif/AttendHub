const supabase = require('../config/supabase');
const { fetchAll } = require('../utils/db');
const { todayStr } = require('../utils/time');

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

// Loads everything needed for attendance numbers. Fine for one college's data size.
async function loadAttendanceData() {
  const students = await fetchAll(() =>
    supabase.from('students').select('id, roll_number, section_id, class_sections(name), users(full_name)').order('roll_number')
  );
  const sessions = await fetchAll(() =>
    supabase.from('class_sessions').select('id, section_id, subject_id, status, expiry_time, session_date, subjects(name)').order('start_time')
  );
  const attendance = await fetchAll(() => supabase.from('attendance').select('session_id, student_id').order('marked_time'));

  const now = Date.now();
  // only count sessions that are over (an open session is not "missed" yet)
  const finished = sessions.filter((s) => s.status !== 'active' || new Date(s.expiry_time).getTime() <= now);
  return { students, sessions, finished, attendance };
}

function perStudent({ students, finished, attendance }) {
  const finishedIds = new Set(finished.map((s) => s.id));
  const totalBySection = new Map();
  finished.forEach((s) => totalBySection.set(s.section_id, (totalBySection.get(s.section_id) || 0) + 1));
  const presentByStudent = new Map();
  attendance.forEach((a) => {
    if (finishedIds.has(a.session_id)) presentByStudent.set(a.student_id, (presentByStudent.get(a.student_id) || 0) + 1);
  });

  return students.map((st) => {
    const total = totalBySection.get(st.section_id) || 0;
    const attended = presentByStudent.get(st.id) || 0;
    return {
      roll_number: st.roll_number,
      full_name: st.users.full_name,
      section: st.class_sections?.name || '',
      attended,
      total,
      percentage: total ? pct(attended, total) : 100,
    };
  });
}

async function getSummary() {
  const data = await loadAttendanceData();
  const { students, sessions, finished, attendance } = data;

  // subject-wise: present marks / (students in section x finished sessions)
  const sectionSize = new Map();
  students.forEach((s) => sectionSize.set(s.section_id, (sectionSize.get(s.section_id) || 0) + 1));
  const sessionById = new Map(finished.map((s) => [s.id, s]));
  const bySubject = new Map(); // name -> { possible, present }
  finished.forEach((s) => {
    const key = s.subjects?.name || 'Unknown';
    const row = bySubject.get(key) || { possible: 0, present: 0 };
    row.possible += sectionSize.get(s.section_id) || 0;
    bySubject.set(key, row);
  });
  attendance.forEach((a) => {
    const s = sessionById.get(a.session_id);
    if (s) bySubject.get(s.subjects?.name || 'Unknown').present += 1;
  });
  const attendance_by_subject = [...bySubject.entries()].map(([subject, v]) => ({ subject, percentage: pct(v.present, v.possible) }));

  const low_attendance = perStudent(data)
    .filter((s) => s.total > 0 && s.percentage < 75)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 50);

  // test-wise marks
  const results = await fetchAll(() => supabase.from('results').select('test_id, marks_obtained, tests(name)').order('created_at'));
  const byTest = new Map();
  results.forEach((r) => {
    const row = byTest.get(r.test_id) || { test: r.tests?.name || 'Test', marks: [] };
    row.marks.push(r.marks_obtained);
    byTest.set(r.test_id, row);
  });
  const test_performance = [...byTest.values()].map((t) => ({
    test: t.test,
    highest: Math.max(...t.marks),
    lowest: Math.min(...t.marks),
    average: Math.round((t.marks.reduce((a, b) => a + b, 0) / t.marks.length) * 10) / 10,
  }));

  const testCount = await supabase.from('tests').select('id', { count: 'exact', head: true });
  const subjects = await supabase.from('subjects').select('id', { count: 'exact', head: true });

  return {
    totals: {
      students: students.length,
      subjects: subjects.count || 0,
      tests: testCount.count || 0,
      sessions_today: sessions.filter((s) => s.session_date === todayStr()).length,
    },
    attendance_by_subject,
    test_performance,
    low_attendance,
  };
}

async function getAttendanceRows() {
  return perStudent(await loadAttendanceData());
}

module.exports = { getSummary, getAttendanceRows };
