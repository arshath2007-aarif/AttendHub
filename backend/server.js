require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { autoSubmitExpired } = require('./services/testService');
const { expireOldSessions } = require('./services/attendanceService');

const app = express();
app.set('trust proxy', 1); // correct client IPs behind Render/Vercel/proxies for rate limiting

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Robust CORS supporting multiple origins, wildcards, and trimming
const rawOrigins = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, uptime health checks)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, '');
      if (
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(cleanOrigin) ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '200kb' }));

// Health check endpoint for uptime checkers (Render, Railway, UptimeRobot, etc.)
app.get('/api/health', (req, res) => res.json({ ok: true, server_time: new Date().toISOString() }));
app.use('/api', routes);

// Optional: Serve compiled frontend in production (Single-service deployment mode)
const frontendDist = path.resolve(__dirname, '../frontend/dist');
const shouldServeFrontend =
  process.env.SERVE_FRONTEND === 'true' ||
  (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist));

if (shouldServeFrontend && fs.existsSync(frontendDist)) {
  console.log(`Serving static frontend build from ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`AttendHub API running on port ${PORT}`));

// Background job every 30s: auto-submit tests past deadline, close expired attendance sessions
const intervalId = setInterval(() => {
  autoSubmitExpired().catch((e) => console.error('auto-submit job:', e.message));
  expireOldSessions().catch((e) => console.error('expire job:', e.message));
}, 30 * 1000);

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down server gracefully...');
  clearInterval(intervalId);
  server.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
