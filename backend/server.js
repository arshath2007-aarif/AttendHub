require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { autoSubmitExpired } = require('./services/testService');
const { expireOldSessions } = require('./services/attendanceService');

const app = express();
app.set('trust proxy', 1); // correct client IPs behind Render/Vercel for rate limiting

app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, server_time: new Date().toISOString() }));
app.use('/api', routes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`AttendHub API running on http://localhost:${PORT}`));

// Backend job every 30s: auto-submit tests past their deadline, close expired attendance sessions.
// This is what makes auto-submit work even if the student closed the browser.
setInterval(() => {
  autoSubmitExpired().catch((e) => console.error('auto-submit job:', e.message));
  expireOldSessions().catch((e) => console.error('expire job:', e.message));
}, 30 * 1000);
