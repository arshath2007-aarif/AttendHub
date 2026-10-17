const TZ = process.env.TZ_NAME || 'Asia/Kolkata';

// "YYYY-MM-DD" for today in the college's timezone
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

module.exports = { todayStr };
