const express = require("express");
const { v4: uuidv4 } = require("uuid");
const auditRouter = require("./routes/audit");

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.locals.requestId = uuidv4();
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "audit-log" });
});

app.get("/ready", (req, res) => {
  res.json({ status: "ready", service: "audit-log" });
});

app.use("/audit", auditRouter);

module.exports = app;
const client = require('prom-client');

// Create a Registry to collect metrics
const register = new client.Registry();

// Add default metrics (Node.js metrics)
client.collectDefaultMetrics({ register });

// Custom metric: HTTP request duration histogram
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});
register.registerMetric(httpRequestDurationMicroseconds);

// Middleware to measure request duration
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
  });
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
