const express = require("express");
const path = require("path");
const {
  errorHandler,
  notFound,
  requestContext
} = require("../../../shared/http");
const { createDocsHandler, createMetrics, createOpenApiHandler } = require("../../../shared/observability");
const { createStorageGatewayRouter } = require("./routes");
const { createObjectStorageService } = require("./services/object-storage-service");

function createStorageGatewayApp(options) {
  const {
    logger,
    publisher,
    readyCheck,
    objectModel,
    serviceName,
    storageRoot
  } = options;

  const app = express();
  const objectStorageService = createObjectStorageService({ objectModel, publisher, storageRoot });
  const metrics = createMetrics(serviceName);
  const openApiPath = path.join(__dirname, "../openapi.yaml");

  app.use(requestContext(serviceName));
  app.use(metrics.middleware);
  app.get(
    "/docs",
    createDocsHandler({
      openApiPath,
      title: "Storage Gateway API"
    })
  );
  app.get("/api-docs", createDocsHandler({
    openApiPath,
    title: "Storage Gateway API"
  }));
  app.get("/openapi.yaml", createOpenApiHandler(openApiPath));
  app.get("/metrics", metrics.handler);
  app.use(createStorageGatewayRouter({ objectStorageService, readyCheck }));

  app.use(notFound);
  app.use(errorHandler(logger));

  return app;
}

module.exports = { createStorageGatewayApp };
