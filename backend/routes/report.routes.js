const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const c = require('../controllers/report.controller');

router.use('/reports', auth, requireRole('teacher', 'admin'));
router.get('/reports/summary', asyncHandler(c.summary));
router.get('/reports/attendance/export', asyncHandler(c.attendanceCsv));

module.exports = router;
