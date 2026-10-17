const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');
const { todayStr } = require('../utils/time');
const { getStudentByUser } = require('../services/studentService');
const { expireOldSessions } = require('../services/attendanceService');

// GET /cr/options  (CR, teacher, admin) - dropdown data
exports.options = async (req, res) => {
  const subjects = unwrap(await supabase.from('subjects').select('id, name').order('name'));
  const sections = unwrap(await supabase.from('class_sections').select('id, name').order('name'));
  res.json({ subjects, sections });
};

// GET /cr/dashboard
exports.dashboard = async (req, res) => {
  const cr = await getStudentByUser(req.user.id);
  const nowIso = new Date().toISOString();
  await expireOldSessions();

  const [active] = unwrap(
    await supabase
      .from('class_sessions')
      .select('id, session_code, expiry_time, subjects(name), class_sections(name)')
      .eq('cr_id', cr.id)
      .eq('status', 'active')
      .gt('expiry_time', nowIso)
      .limit(1)
  );

  // today's numbers come from this CR's most recent session today
  const [latest] = unwrap(
    await supabase
      .from('class_sessions')
      .select('id')
      .eq('cr_id', cr.id)
      .eq('session_date', todayStr())
      .order('start_time', { ascending: false })
      .limit(1)
  );
  let present = 0;
  let absent = 0;
  if (latest) {
    const p = await supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('session_id', latest.id);
    const t = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('section_id', cr.section_id);
    present = p.count || 0;
    absent = Math.max(0, (t.count || 0) - present);
  }

  const activeTests = await supabase
    .from('tests')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', req.user.id)
    .eq('is_published', true)
    .lte('start_time', nowIso)
    .gte('expiry_time', nowIso);

  const pending = await supabase
    .from('test_sessions')
    .select('id, tests!inner(created_by)', { count: 'exact', head: true })
    .eq('status', 'in_progress')
    .eq('tests.created_by', req.user.id);

  res.json({
    today: { present, absent },
    active_tests: activeTests.count || 0,
    pending_submissions: pending.count || 0,
    active_session: active
      ? {
          id: active.id,
          session_code: active.session_code,
          expiry_time: active.expiry_time,
          subject: active.subjects?.name,
          section: active.class_sections?.name,
        }
      : null,
    server_time: nowIso,
  });
};
