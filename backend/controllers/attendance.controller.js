const attendanceService = require('../services/attendanceService');
const { toCsv, sendCsv } = require('../utils/csvExport');

exports.start = async (req, res) => res.status(201).json(await attendanceService.startSession(req.user, req.body));
exports.stop = async (req, res) => res.json(await attendanceService.stopSession(req.user, req.params.id));
exports.mark = async (req, res) => res.json(await attendanceService.markAttendance(req.user, req.body));

exports.live = async (req, res) => {
  const { present, total } = await attendanceService.getSessionAttendance(req.user, req.params.id);
  res.json({ present, total });
};

exports.exportCsv = async (req, res) => {
  const { session, present, absent } = await attendanceService.getSessionAttendance(req.user, req.params.id);
  const rows = [
    ...present.map((p) => ({ ...p, status: 'Present' })),
    ...absent.map((a) => ({ ...a, status: 'Absent', marked_time: '' })),
  ].sort((a, b) => a.roll_number.localeCompare(b.roll_number));
  const csv = toCsv(rows, [
    { key: 'roll_number', label: 'Roll No' },
    { key: 'full_name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'marked_time', label: 'Marked At' },
  ]);
  sendCsv(res, `attendance-${session.subjects.name}-${session.session_date}.csv`.replace(/[^\w.-]/g, '_'), csv);
};
