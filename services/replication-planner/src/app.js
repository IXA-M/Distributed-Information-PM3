const express = require("express");
const path = require("path");
const {
  errorHandler,
  notFound,
  requestContext
} = require("../../../shared/http");
const { createDocsHandler, createMetrics, createOpenApiHandler } = require("../../../shared/observability");
const { createReplicationPlannerRouter } = require("./routes");

function createReplicationPlannerApp(options) {
  const { logger, planner, readyCheck, serviceName } = options;
  const app = express();
  const metrics = createMetrics(serviceName);
  const openApiPath = path.join(__dirname, "../openapi.yaml");

  app.use(requestContext(serviceName));
  app.use(metrics.middleware);
  app.use(express.json({ limit: "1mb" }));
  app.get(
    "/docs",
    createDocsHandler({
      openApiPath,
      title: "Replication Planner API"
    })
  );
  app.get("/api-docs", createDocsHandler({
    openApiPath,
    title: "Replication Planner API"
  }));
  app.get("/openapi.yaml", createOpenApiHandler(openApiPath));
  app.get("/metrics", metrics.handler);
  app.use(createReplicationPlannerRouter({ planner, readyCheck }));

  app.use(notFound);
  app.use(errorHandler(logger));

  return app;
}

module.exports = { createReplicationPlannerApp };
