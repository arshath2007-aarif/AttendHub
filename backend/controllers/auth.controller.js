const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { unwrap } = require('../utils/db');

// POST /auth/resolve  { identifier: "22CS001" }  ->  { email }
// Lets students log in with a roll number: the frontend turns it into an email for Supabase Auth.
exports.resolve = async (req, res) => {
  const roll = String(req.body.identifier || '').trim();
  if (!roll || roll.length > 40) throw new AppError(400, 'Enter your roll number');

  const student = unwrap(
    await supabase.from('students').select('users(email)').ilike('roll_number', roll.replace(/[%_]/g, '\\$&')).maybeSingle()
  );
  if (!student) throw new AppError(404, 'Roll number not found');
  res.json({ email: student.users.email });
};

// GET /me
exports.me = async (req, res) => {
  const student = unwrap(
    await supabase.from('students').select('id, roll_number, section_id, is_cr').eq('user_id', req.user.id).maybeSingle()
  );
  res.json({
    id: req.user.id,
    email: req.user.email,
    full_name: req.user.full_name,
    role: req.user.role,
    roll_number: student?.roll_number || null,
    section_id: student?.section_id || null,
  });
};
