const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const c = require('../controllers/cr.controller');

router.get('/cr/options', auth, requireRole('cr', 'teacher', 'admin'), asyncHandler(c.options));
router.get('/cr/dashboard', auth, requireRole('cr'), asyncHandler(c.dashboard));

module.exports = router;
