const router = require('express').Router();

router.use(require('./auth.routes'));
router.use(require('./student.routes'));
router.use(require('./attendance.routes'));
router.use(require('./cr.routes'));
router.use(require('./test.routes'));
router.use(require('./report.routes'));

module.exports = router;
