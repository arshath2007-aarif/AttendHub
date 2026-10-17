const reportService = require('../services/reportService');
const { toCsv, sendCsv } = require('../utils/csvExport');

exports.summary = async (req, res) => res.json(await reportService.getSummary());

exports.attendanceCsv = async (req, res) => {
  const rows = await reportService.getAttendanceRows();
  const csv = toCsv(rows, [
    { key: 'roll_number', label: 'Roll No' },
    { key: 'full_name', label: 'Name' },
    { key: 'section', label: 'Section' },
    { key: 'attended', label: 'Classes Attended' },
    { key: 'total', label: 'Total Classes' },
    { key: 'percentage', label: 'Attendance %' },
  ]);
  sendCsv(res, 'attendance-report.csv', csv);
};
