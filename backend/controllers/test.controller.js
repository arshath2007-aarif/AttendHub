const testService = require('../services/testService');
const { getStudentByUser } = require('../services/studentService');
const { toCsv, sendCsv } = require('../utils/csvExport');
const fmtSeconds = (s) => (s == null ? '' : `${Math.floor(s / 60)}m ${s % 60}s`);

// ----- student -----
exports.listForStudent = async (req, res) => res.json(await testService.listForStudent(await getStudentByUser(req.user.id)));
exports.start = async (req, res) => res.json(await testService.startTest(await getStudentByUser(req.user.id), req.params.id));
exports.answer = async (req, res) =>
  res.json(await testService.saveAnswer(await getStudentByUser(req.user.id), req.params.id, req.body));
exports.submit = async (req, res) => res.json(await testService.submitTest(await getStudentByUser(req.user.id), req.params.id));

// ----- CR / teacher / admin -----
exports.manage = async (req, res) => res.json(await testService.listForManage(req.user));
exports.create = async (req, res) => res.status(201).json(await testService.createTest(req.user, req.body));
exports.publish = async (req, res) => res.json(await testService.setPublish(req.user, req.params.id, req.body.is_published));
exports.remove = async (req, res) => res.json(await testService.deleteTest(req.user, req.params.id));
exports.monitor = async (req, res) => res.json(await testService.monitor(req.user, req.params.id));
exports.release = async (req, res) => res.json(await testService.releaseResults(req.user, req.params.id));

exports.exportCsv = async (req, res) => {
  const { test, rows } = await testService.monitor(req.user, req.params.id);
  const csv = toCsv(
    rows.map((r) => ({ ...r, time_spent: fmtSeconds(r.time_spent_seconds), total: test.total_marks })),
    [
      { key: 'roll_number', label: 'Roll No' },
      { key: 'full_name', label: 'Name' },
      { key: 'login_time', label: 'Login Time' },
      { key: 'status', label: 'Status' },
      { key: 'submitted_time', label: 'Submitted Time' },
      { key: 'time_spent', label: 'Time Spent' },
      { key: 'marks_obtained', label: 'Marks' },
      { key: 'total', label: 'Out Of' },
    ]
  );
  sendCsv(res, `${test.name}-results.csv`.replace(/[^\w.-]/g, '_'), csv);
};
