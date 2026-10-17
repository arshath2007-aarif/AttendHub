const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// 1) read the Bearer token  2) ask Supabase if it is valid  3) load the user's role from our users table
module.exports = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError(401, 'Please log in');

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new AppError(401, 'Session expired. Please log in again');

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', data.user.id)
    .maybeSingle();
  if (!profile) throw new AppError(403, 'No profile found for this account. Contact admin.');

  req.user = profile; // { id, email, full_name, role }
  next();
});
