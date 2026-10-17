const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const c = require('../controllers/student.controller');

router.use('/student', auth, requireRole('student'));
router.get('/student/dashboard', asyncHandler(c.dashboard));
router.get('/student/attendance', asyncHandler(c.attendance));

module.exports = router;
