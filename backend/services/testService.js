const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { unwrap } = require('../utils/db');
const { gradeSession } = require('./gradingService');

// ---------- helpers ----------

// upcoming / active / expired, decided with the SERVER clock
function timeStatus(test, nowMs = Date.now()) {
  if (nowMs < new Date(test.start_time).getTime()) return 'upcoming';
  if (nowMs > new Date(test.expiry_time).getTime()) return 'expired';
  return 'active';
}

const countOf = (t) => t.questions?.[0]?.count ?? 0;

async function getManageableTest(user, testId) {
  const test = unwrap(
    await supabase
      .from('tests')
      .select('id, name, created_by, total_marks, results_released, is_published')
      .eq('id', testId)
      .maybeSingle()
  );
  if (!test) throw new AppError(404, 'Test not found');
  // A CR can only manage tests they created. Teacher/admin can manage all.
  if (user.role === 'cr' && test.created_by !== user.id) throw new AppError(403, 'This is not your test');
  return test;
}

// A student can only ever touch their OWN test session
async function getOwnSession(student, sessionId) {
  const session = unwrap(
    await supabase.from('test_sessions').select('*').eq('id', sessionId).eq('student_id', student.id).maybeSingle()
  );
  if (!session) throw new AppError(404, 'Test session not found');
  return session;
}

// ---------- listing ----------

async function listForStudent(student) {
  const tests = unwrap(
    await supabase
      .from('tests')
      .select('id, name, description, start_time, expiry_time, duration_minutes, total_marks, results_released, subjects(name), questions(count)')
      .eq('is_published', true)
      .order('start_time', { ascending: false })
  );
  const sessions = unwrap(await supabase.from('test_sessions').select('test_id, status').eq('student_id', student.id));
  const results = unwrap(await supabase.from('results').select('test_id, marks_obtained').eq('student_id', student.id));
  const sessionOf = new Map(sessions.map((s) => [s.test_id, s.status]));
  const marksOf = new Map(results.map((r) => [r.test_id, r.marks_obtained]));

  return tests.map((t) => {
    const sess = sessionOf.get(t.id);
    const done = sess === 'submitted' || sess === 'auto_submitted';
    return {
      id: t.id,
      name: t.name,
      subject: t.subjects?.name,
      description: t.description,
      start_time: t.start_time,
      expiry_time: t.expiry_time,
      duration_minutes: t.duration_minutes,
      total_marks: t.total_marks,
      question_count: countOf(t),
      status: done ? 'completed' : timeStatus(t),
      in_progress: sess === 'in_progress',
      results_released: t.results_released,
      // marks stay hidden until the teacher releases them
      marks_obtained: done && t.results_released ? marksOf.get(t.id) ?? null : null,
    };
  });
}

async function listForManage(user) {
  let query = supabase
    .from('tests')
    .select('id, name, start_time, expiry_time, duration_minutes, total_marks, is_published, results_released, created_by, subjects(name), questions(count)')
    .order('created_at', { ascending: false });
  if (user.role === 'cr') query = query.eq('created_by', user.id);
  const tests = unwrap(await query);

  return tests.map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subjects?.name,
    start_time: t.start_time,
    expiry_time: t.expiry_time,
    duration_minutes: t.duration_minutes,
    total_marks: t.total_marks,
    question_count: countOf(t),
    is_published: t.is_published,
    results_released: t.results_released,
    status: timeStatus(t),
  }));
}

// ---------- create / publish / delete ----------

async function createTest(user, b) {
  const name = String(b.name || '').trim();
  if (!name) throw new AppError(400, 'Test name is required');
  if (!b.subject_id) throw new AppError(400, 'Select a subject');

  const start = new Date(b.start_time);
  const expiry = new Date(b.expiry_time);
  if (isNaN(start) || isNaN(expiry)) throw new AppError(400, 'Enter valid start and expiry times');
  if (expiry <= start) throw new AppError(400, 'Expiry must be after the start time');

  const duration = Number(b.duration_minutes);
  if (!Number.isInteger(duration) || duration < 1 || duration > 600) throw new AppError(400, 'Duration must be 1 to 600 minutes');

  if (!Array.isArray(b.questions) || b.questions.length < 1 || b.questions.length > 100) {
    throw new AppError(400, 'Add between 1 and 100 questions');
  }

  const questions = b.questions.map((q, i) => {
    const n = i + 1;
    if (q.type && q.type !== 'mcq') throw new AppError(400, `Question ${n}: only MCQ is supported right now`);
    const text = String(q.question_text || '').trim();
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [];
    const marks = Number(q.marks);
    if (!text) throw new AppError(400, `Question ${n}: question text is empty`);
    if (options.length < 2 || options.length > 6 || options.some((o) => !o) || new Set(options).size !== options.length) {
      throw new AppError(400, `Question ${n}: give 2 to 6 different, non-empty options`);
    }
    if (!options.includes(q.correct_answer)) throw new AppError(400, `Question ${n}: correct answer must be one of the options`);
    if (!Number.isInteger(marks) || marks < 1 || marks > 100) throw new AppError(400, `Question ${n}: marks must be 1 to 100`);
    return { type: 'mcq', question_text: text, options, correct_answer: q.correct_answer, marks, position: i };
  });

  const test = unwrap(
    await supabase
      .from('tests')
      .insert({
        name,
        subject_id: b.subject_id,
        description: String(b.description || '').trim() || null,
        created_by: user.id,
        start_time: start.toISOString(),
        expiry_time: expiry.toISOString(),
        duration_minutes: duration,
        total_marks: questions.reduce((sum, q) => sum + q.marks, 0),
        is_published: b.publish === true,
      })
      .select()
      .single()
  );

  const { error } = await supabase.from('questions').insert(questions.map((q) => ({ ...q, test_id: test.id })));
  if (error) {
    await supabase.from('tests').delete().eq('id', test.id); // undo, so no test without questions
    unwrap({ data: null, error });
  }
  return test;
}

async function setPublish(user, testId, isPublished) {
  if (typeof isPublished !== 'boolean') throw new AppError(400, 'is_published must be true or false');
  await getManageableTest(user, testId);
  unwrap(await supabase.from('tests').update({ is_published: isPublished }).eq('id', testId));
  return { ok: true };
}

async function deleteTest(user, testId) {
  await getManageableTest(user, testId);
  unwrap(await supabase.from('tests').delete().eq('id', testId)); // questions, sessions, answers, results cascade
  return { ok: true };
}

// ---------- finishing a test ----------

async function ensureResult(session) {
  const existing = unwrap(await supabase.from('results').select('*').eq('test_session_id', session.id).maybeSingle());
  if (existing) return existing;
  const { marks, total } = await gradeSession(session.id, session.test_id);
  return unwrap(
    await supabase
      .from('results')
      .upsert(
        { test_session_id: session.id, test_id: session.test_id, student_id: session.student_id, marks_obtained: marks, total_marks: total },
        { onConflict: 'test_session_id' }
      )
      .select()
      .single()
  );
}

// Closes an in-progress session. The `.eq('status','in_progress')` guard means only ONE
// request can win, so a test can never be submitted twice.
async function finalizeSession(session, { auto = false } = {}) {
  const nowMs = Date.now();
  const deadlineMs = new Date(session.deadline).getTime();
  // 3s tolerance for network delay when the browser timer hits zero
  const status = auto || nowMs >= deadlineMs - 3000 ? 'auto_submitted' : 'submitted';
  const endMs = Math.min(nowMs, deadlineMs); // nothing counts after the deadline
  const endIso = new Date(endMs).toISOString();

  unwrap(
    await supabase
      .from('test_sessions')
      .update({
        status,
        submitted_time: endIso,
        logout_time: endIso,
        time_spent_seconds: Math.max(0, Math.round((endMs - new Date(session.login_time).getTime()) / 1000)),
      })
      .eq('id', session.id)
      .eq('status', 'in_progress')
  );
  return ensureResult(session);
}

// Backend job (server.js runs it every 30s): closes sessions whose deadline has passed
async function autoSubmitExpired(testId) {
  let query = supabase.from('test_sessions').select('*').eq('status', 'in_progress').lt('deadline', new Date().toISOString()).limit(200);
  if (testId) query = query.eq('test_id', testId);
  const stale = unwrap(await query);
  for (const s of stale) {
    try {
      await finalizeSession(s, { auto: true });
    } catch (e) {
      console.error('Auto-submit failed for session', s.id, e.message);
    }
  }
  return stale.length;
}

// ---------- student taking a test ----------

async function startTest(student, testId) {
  const nowMs = Date.now();
  const test = unwrap(
    await supabase
      .from('tests')
      .select('id, name, start_time, expiry_time, duration_minutes, is_published')
      .eq('id', testId)
      .maybeSingle()
  );
  // unpublished tests look like they do not exist
  if (!test || !test.is_published) throw new AppError(404, 'Test not found');

  let session = unwrap(
    await supabase.from('test_sessions').select('*').eq('test_id', testId).eq('student_id', student.id).maybeSingle()
  );

  if (session) {
    if (session.status !== 'in_progress') throw new AppError(409, 'You have already submitted this test');
    if (nowMs >= new Date(session.deadline).getTime()) {
      await finalizeSession(session, { auto: true });
      throw new AppError(409, 'Your time is over. The test was auto-submitted.');
    }
    // otherwise: resume (page refresh, phone switched, etc.)
  } else {
    if (nowMs < new Date(test.start_time).getTime()) throw new AppError(403, 'This test has not started yet');
    if (nowMs > new Date(test.expiry_time).getTime()) throw new AppError(403, 'This test has expired');

    // deadline = whichever is earlier: login + duration, or the test's closing time
    const deadline = new Date(Math.min(nowMs + test.duration_minutes * 60000, new Date(test.expiry_time).getTime()));
    const { data, error } = await supabase
      .from('test_sessions')
      .insert({ test_id: testId, student_id: student.id, login_time: new Date(nowMs).toISOString(), deadline: deadline.toISOString() })
      .select()
      .single();
    if (error && error.code === '23505') {
      // two taps at once: use the session that won
      session = unwrap(await supabase.from('test_sessions').select('*').eq('test_id', testId).eq('student_id', student.id).single());
    } else {
      session = unwrap({ data, error });
    }
  }

  // NOTE: correct_answer is deliberately NOT selected. Students never receive it.
  const questions = unwrap(
    await supabase.from('questions').select('id, type, question_text, options, marks').eq('test_id', testId).order('position')
  );
  const saved = unwrap(await supabase.from('answers').select('question_id, answer').eq('test_session_id', session.id));

  return {
    test_session_id: session.id,
    test: { id: test.id, name: test.name },
    questions,
    deadline: session.deadline,
    server_time: new Date().toISOString(),
    saved_answers: Object.fromEntries(saved.map((a) => [a.question_id, a.answer])),
  };
}

async function saveAnswer(student, sessionId, body) {
  const { question_id, answer } = body;
  if (typeof question_id !== 'string' || typeof answer !== 'string') throw new AppError(400, 'Invalid answer');

  const session = await getOwnSession(student, sessionId);
  if (session.status !== 'in_progress') throw new AppError(409, 'This test is already submitted');
  if (Date.now() > new Date(session.deadline).getTime()) {
    await finalizeSession(session, { auto: true });
    throw new AppError(409, 'Time is up. Your test was auto-submitted.');
  }

  const q = unwrap(
    await supabase.from('questions').select('id, type, options').eq('id', question_id).eq('test_id', session.test_id).maybeSingle()
  );
  if (!q) throw new AppError(400, 'That question is not part of this test');
  if (q.type === 'mcq' && !(q.options || []).includes(answer)) throw new AppError(400, 'Invalid option');

  unwrap(
    await supabase
      .from('answers')
      .upsert({ test_session_id: session.id, question_id, answer }, { onConflict: 'test_session_id,question_id' })
  );
  return { saved: true };
}

async function submitTest(student, sessionId) {
  const session = await getOwnSession(student, sessionId);
  // Safe to call twice: only the first call changes anything, the second returns the stored result
  if (session.status === 'in_progress') await finalizeSession(session);

  const fresh = unwrap(await supabase.from('test_sessions').select('*').eq('id', session.id).single());
  const result = await ensureResult(fresh);
  const test = unwrap(await supabase.from('tests').select('results_released').eq('id', fresh.test_id).single());

  return {
    status: fresh.status,
    results_released: test.results_released,
    total_marks: result.total_marks,
    marks_obtained: test.results_released ? result.marks_obtained : null, // hidden until released
  };
}

// ---------- CR / teacher monitoring ----------

async function monitor(user, testId) {
  const test = await getManageableTest(user, testId);
  await autoSubmitExpired(testId);

  const sessions = unwrap(
    await supabase
      .from('test_sessions')
      .select('login_time, status, submitted_time, time_spent_seconds, students(roll_number, users(full_name)), results(marks_obtained)')
      .eq('test_id', testId)
      .order('login_time')
  );
  const rows = sessions.map((s) => {
    const r = Array.isArray(s.results) ? s.results[0] : s.results;
    return {
      full_name: s.students.users.full_name,
      roll_number: s.students.roll_number,
      login_time: s.login_time,
      status: s.status,
      submitted_time: s.submitted_time,
      time_spent_seconds: s.time_spent_seconds,
      marks_obtained: r ? r.marks_obtained : null,
    };
  });
  return {
    test: { id: test.id, name: test.name, total_marks: test.total_marks, results_released: test.results_released },
    rows,
  };
}

async function releaseResults(user, testId) {
  await getManageableTest(user, testId);
  await autoSubmitExpired(testId); // make sure late sessions have results first
  unwrap(await supabase.from('tests').update({ results_released: true }).eq('id', testId));
  return { ok: true };
}

module.exports = {
  listForStudent, listForManage, createTest, setPublish, deleteTest,
  startTest, saveAnswer, submitTest, monitor, releaseResults, autoSubmitExpired,
};
