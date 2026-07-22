require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectDatabase } = require('./config/database');
const trainRoutes = require('./routes/trains');
const analyticsRoutes = require('./routes/analytics');
const connectionRoutes = require('./routes/connections');
const { startDelayTracker } = require('./services/delayTrackerService');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────

// Health check used by Docker Compose and monitoring tools.
// Returns 503 when the database is not ready so load balancers won't route
// traffic to an instance that can't serve data.
app.get('/api/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbLabels = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  res.json({
    status: 'ok',
    db: dbLabels[dbState] ?? 'unknown',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/trains', trainRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/connections', connectionRoutes);

// 404 — must come after all route registrations
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler — the 4-argument signature is required by Express
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────
// connectDatabase() never throws — it logs a warning and the server starts
// regardless. The departure board works without MongoDB; only analytics needs it.
async function bootstrap() {
  await connectDatabase();
  startDelayTracker();
  app.listen(PORT, () => {
    console.log(`🚀 Swiss Rail Live Pulse API → http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal: server failed to start', err);
  process.exit(1);
});

module.exports = app;
