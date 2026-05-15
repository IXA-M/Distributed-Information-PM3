const { randomBytes } = require("crypto");

const client = require("prom-client");

function createObservability(serviceName) {
  const register = new client.Registry();

  if (process.env.NODE_ENV !== "test") {
    client.collectDefaultMetrics({
      register,
      prefix: `${serviceName.replace(/-/g, "_")}_`
    });
  }

  const requestCounter = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests handled by the service.",
    labelNames: ["service", "method", "route", "status_code"],
    registers: [register]
  });

  const errorCounter = new client.Counter({
    name: "http_request_errors_total",
    help: "Total number of failed HTTP requests handled by the service.",
    labelNames: ["service", "method", "route", "status_code"],
    registers: [register]
  });

  const latencyHistogram = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request latency in seconds.",
    labelNames: ["service", "method", "route", "status_code"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [register]
  });

  return {
    requestContextMiddleware(req, res, next) {
      const traceContext = getTraceContext(req);
      req.traceId = traceContext.traceId;
      req.spanId = traceContext.spanId;
      req.traceparent = traceContext.traceparent;

      res.setHeader("x-request-id", req.requestId);
      res.setHeader("traceparent", req.traceparent);

      const startedAt = process.hrtime.bigint();

      res.on("finish", () => {
        const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
        const route = req.route?.path || req.path || "unknown";
        const labels = {
          service: serviceName,
          method: req.method,
          route,
          status_code: String(res.statusCode)
        };

        requestCounter.inc(labels);
        latencyHistogram.observe(labels, durationSeconds);

        if (res.statusCode >= 400) {
          errorCounter.inc(labels);
        }
      });

      next();
    },

    log(level, message, fields = {}) {
      const entry = {
        timestamp: new Date().toISOString(),
        service: serviceName,
        request_id: fields.requestId || null,
        trace_id: fields.traceId || null,
        span_id: fields.spanId || null,
        level,
        message,
        ...sanitizeFields(fields)
      };

      const line = JSON.stringify(entry);
      if (level === "error") {
        console.error(line);
        return;
      }

      console.log(line);
    },

    async metricsHandler(req, res) {
      res.set("Content-Type", register.contentType);
      res.send(await register.metrics());
    }
  };
}

function getTraceContext(req) {
  const header = req.header("traceparent");
  const match = header?.match(/^00-([a-f0-9]{32})-([a-f0-9]{16})-[a-f0-9]{2}$/i);

  if (match) {
    return {
      traceId: match[1].toLowerCase(),
      spanId: randomHex(8),
      traceparent: `00-${match[1].toLowerCase()}-${randomHex(8)}-01`
    };
  }

  const traceId = randomHex(16);
  const spanId = randomHex(8);

  return {
    traceId,
    spanId,
    traceparent: `00-${traceId}-${spanId}-01`
  };
}

function randomHex(size) {
  return randomBytes(size).toString("hex");
}

function sanitizeFields(fields) {
  const sanitized = { ...fields };
  delete sanitized.requestId;
  delete sanitized.traceId;
  delete sanitized.spanId;
  return sanitized;
}

module.exports = {
  createObservability
};
