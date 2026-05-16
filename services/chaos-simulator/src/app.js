const express = require("express");
const swaggerUi = require("swagger-ui-express");
const env = require("./config/env");
const chaosRoutes = require("./routes/chaosRoutes");
const requestContext = require("./middleware/requestContext");
const { getKafkaStatus } = require("./config/kafka");
const { mongoose } = require("./config/database");
const { createObservability } = require("./observability");
const { countRules } = require("./services/chaosService");
const openApiDocument = require("../docs/openapi.json");

const app = express();
const observability = createObservability(env.serviceName);

app.use(express.json());
app.use(requestContext(env.serviceName));
app.use(observability.requestContextMiddleware);
app.use((req, _res, next) => {
  observability.log("info", "Incoming request", {
    requestId: req.requestId,
    traceId: req.traceId,
    spanId: req.spanId,
    method: req.method,
    path: req.path
  });
  next();
});
app.use(chaosRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get("/docs", (_req, res) => {
  res.redirect(302, "/api-docs");
});

app.get("/docs/openapi.json", (_req, res) => {
  return res.json(openApiDocument);
});

app.get("/health", async (req, res) => {
  const totalRules = await countRules().catch(() => 0);
  return res.json({
    success: true,
    data: {
      status: "ok",
      totalRules
    },
    meta: {
      service: req.serviceName,
      request_id: req.requestId
    }
  });
});

app.get("/ready", (req, res) => {
  const kafkaStatus = getKafkaStatus();
  const ready = mongoose.connection.readyState === 1 && kafkaStatus.producerConnected;

  return res.status(ready ? 200 : 503).json({
    success: ready,
    data: {
      ready,
      database: mongoose.connection.readyState === 1,
      kafka: kafkaStatus
    },
    meta: {
      service: req.serviceName,
      request_id: req.requestId
    }
  });
});

app.get("/metrics", async (req, res, next) => {
  try {
    await observability.metricsHandler(req, res);
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  observability.log("warn", "Route not found", {
    requestId: req.requestId,
    traceId: req.traceId,
    spanId: req.spanId,
    method: req.method,
    path: req.path
  });

  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found.",
      details: {}
    },
    meta: {
      service: req.serviceName,
      request_id: req.requestId
    }
  });
});

module.exports = app;
