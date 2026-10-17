const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');

// Marks are ALWAYS computed here from the correct answers in the database.
// The browser never sends marks, so they cannot be edited.
async function gradeSession(sessionId, testId) {
  const questions = unwrap(await supabase.from('questions').select('id, correct_answer, marks').eq('test_id', testId));
  const answers = unwrap(await supabase.from('answers').select('question_id, answer').eq('test_session_id', sessionId));
  const given = new Map(answers.map((a) => [a.question_id, a.answer]));

  let total = 0;
  let marks = 0;
  const rows = [];
  for (const q of questions) {
    total += q.marks;
    if (!given.has(q.id)) continue;
    const correct = given.get(q.id) === q.correct_answer;
    if (correct) marks += q.marks;
    rows.push({
      test_session_id: sessionId,
      question_id: q.id,
      answer: given.get(q.id),
      is_correct: correct,
      marks_awarded: correct ? q.marks : 0,
    });
  }
  if (rows.length) unwrap(await supabase.from('answers').upsert(rows, { onConflict: 'test_session_id,question_id' }));
  return { marks, total };
}

module.exports = { gradeSession };
