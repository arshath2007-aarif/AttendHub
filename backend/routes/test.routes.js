const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validateId = require('../middleware/validateId');
const c = require('../controllers/test.controller');

router.param('id', validateId);
const staff = requireRole('cr', 'teacher', 'admin');
const teacherOnly = requireRole('teacher', 'admin');

// student
router.get('/tests', auth, requireRole('student'), asyncHandler(c.listForStudent));
router.post('/tests/:id/start', auth, requireRole('student'), asyncHandler(c.start));
router.put('/test-sessions/:id/answer', auth, requireRole('student'), asyncHandler(c.answer));
router.post('/test-sessions/:id/submit', auth, requireRole('student'), asyncHandler(c.submit));

// CR / teacher / admin  (note: /tests/manage must come before /tests/:id/...)
router.get('/tests/manage', auth, staff, asyncHandler(c.manage));
router.post('/tests', auth, staff, asyncHandler(c.create));
router.patch('/tests/:id/publish', auth, staff, asyncHandler(c.publish));
router.get('/tests/:id/monitor', auth, staff, asyncHandler(c.monitor));
router.get('/tests/:id/export', auth, staff, asyncHandler(c.exportCsv));

// teacher / admin only
router.delete('/tests/:id', auth, teacherOnly, asyncHandler(c.remove));
router.post('/tests/:id/release', auth, teacherOnly, asyncHandler(c.release));

module.exports = router;
