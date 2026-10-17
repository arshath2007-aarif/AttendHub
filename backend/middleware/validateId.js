const AppError = require('../utils/AppError');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// router.param('id', validateId) rejects bad ids with 400 instead of a database error
module.exports = (req, res, next, value) => {
  if (!UUID.test(value)) return next(new AppError(400, 'Invalid id'));
  next();
};
