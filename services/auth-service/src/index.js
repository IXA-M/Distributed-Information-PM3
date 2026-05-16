require('dotenv').config();
const { startTracing } = require('../../shared/tracing');
const tracing = startTracing('auth-service');

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logger = require('./config/logger');
const db = require('./config/database');
const { connectKafka, disconnectKafka } = require('./kafka/producer');
const authRoutes = require('./routes/auth');
const { createMetrics } = require('../../shared/observability');

const app = express();
const metrics = createMetrics('auth-service');
const PORT = process.env.PORT || 3001;
const META = { service: 'auth-service' };

app.use(express.json());
app.use(metrics.middleware);
app.use((req, _res, next) => { req.requestId = uuidv4(); next(); });

// ── Health probes ──────────────────────────────────────────────────────────────
app.get('/metrics', metrics.handler);
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'healthy' }, meta: { ...META, request_id: uuidv4() } });
});

app.get('/ready', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ success: true, data: { status: 'ready' }, meta: { ...META, request_id: uuidv4() } });
  } catch {
    res.status(503).json({ success: false, error: { code: 'NOT_READY', message: 'DB unavailable' }, meta: { ...META, request_id: uuidv4() } });
  }
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);

// ── Error handlers ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' }, meta: { ...META, request_id: req.requestId } });
});
app.use((err, req, res, _next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, meta: { ...META, request_id: req.requestId } });
});

// ── Startup ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await db.query('SELECT 1');
    logger.info('PostgreSQL connected');
    await connectKafka();
    const server = app.listen(PORT, () => logger.info(`Auth Service on :${PORT}`));

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM – shutting down');
      server.close();
      await disconnectKafka();
      await db.end();
      await tracing.shutdown();
      process.exit(0);
    });
  } catch (err) {
    logger.error('Startup failed', err);
    process.exit(1);
  }
}

start();

module.exports = app; // exported for tests
