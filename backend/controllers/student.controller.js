const studentService = require('../services/studentService');

exports.dashboard = async (req, res) => res.json(await studentService.getDashboard(req.user.id));
exports.attendance = async (req, res) => res.json(await studentService.getAttendance(req.user.id));
