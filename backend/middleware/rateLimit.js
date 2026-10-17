const rateLimit = require('express-rate-limit');

// Roll-number lookup at login (per IP)
const resolveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Wait a minute and try again.' },
});

// Attendance codes are short, so slow down guessing (per logged-in user)
const attendanceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { message: 'Too many attempts. Wait a minute and try again.' },
});

module.exports = { resolveLimiter, attendanceLimiter };
