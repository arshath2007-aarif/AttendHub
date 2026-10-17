const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middleware/auth');
const { resolveLimiter } = require('../middleware/rateLimit');
const c = require('../controllers/auth.controller');

router.post('/auth/resolve', resolveLimiter, asyncHandler(c.resolve)); // public: used before login
router.get('/me', auth, asyncHandler(c.me));

module.exports = router;
