const AppError = require('../utils/AppError');

// Usage: router.get('/x', auth, requireRole('cr', 'admin'), handler)
module.exports = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(new AppError(403, 'You do not have access to this'));
  next();
};
