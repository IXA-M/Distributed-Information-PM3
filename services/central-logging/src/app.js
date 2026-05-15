const express = require("express");
const { v4: uuidv4 } = require("uuid");
const logsRouter = require("./routes/logs");

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.locals.requestId = uuidv4();
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "central-logging" });
});

app.get("/ready", (req, res) => {
  res.json({ status: "ready", service: "central-logging" });
});

app.use("/logs", logsRouter);

module.exports = app;
const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});
register.registerMetric(httpRequestDurationMicroseconds);

app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
