const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validateId = require('../middleware/validateId');
const { attendanceLimiter } = require('../middleware/rateLimit');
const c = require('../controllers/attendance.controller');

router.param('id', validateId);

// student
router.post('/attendance/mark', auth, requireRole('student'), attendanceLimiter, asyncHandler(c.mark));

// CR (teacher/admin may view)
router.post('/sessions', auth, requireRole('cr'), asyncHandler(c.start));
router.post('/sessions/:id/stop', auth, requireRole('cr'), asyncHandler(c.stop));
router.get('/sessions/:id/attendance', auth, requireRole('cr', 'teacher', 'admin'), asyncHandler(c.live));
router.get('/sessions/:id/export', auth, requireRole('cr', 'teacher', 'admin'), asyncHandler(c.exportCsv));

module.exports = router;
