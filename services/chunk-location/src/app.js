const express = require("express");
const { randomUUID } = require("crypto");

const { AppError } = require("./errors");
const { createObservability } = require("./observability");
const { successResponse, errorResponse } = require("./response");

const SERVICE_NAME = "chunk-location";

function createApp({ repository, observability = createObservability(SERVICE_NAME) }) {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    req.requestId = req.header("x-request-id") || randomUUID();
    next();
  });
  app.use(observability.requestContextMiddleware);

  app.use((req, res, next) => {
    observability.log("info", "Incoming request", {
      requestId: req.requestId,
      traceId: req.traceId,
      spanId: req.spanId,
      method: req.method,
      path: req.path
    });
    next();
  });

  app.get("/health", (req, res) => {
    res.json(
      successResponse(SERVICE_NAME, req.requestId, {
        status: "ok"
      })
    );
  });

  app.get("/ready", async (req, res, next) => {
    try {
      await repository.ping();
      res.json(
        successResponse(SERVICE_NAME, req.requestId, {
          status: "ready"
        })
      );
    } catch (error) {
      next(new AppError(503, "SERVICE_NOT_READY", "Database connection is not ready."));
    }
  });

  app.get("/metrics", async (req, res, next) => {
    try {
      await observability.metricsHandler(req, res);
    } catch (error) {
      next(error);
    }
  });

  app.post("/chunk-locations", async (req, res, next) => {
    try {
      const payload = validateCreateLocation(req.body);
      const location = await repository.createLocation(payload);
      res
        .status(201)
        .json(successResponse(SERVICE_NAME, req.requestId, location));
    } catch (error) {
      next(error);
    }
  });

  app.get("/chunks/:id/replicas", async (req, res, next) => {
    try {
      const chunkId = req.params.id;
      if (!chunkId) {
        throw new AppError(400, "VALIDATION_ERROR", "chunk id is required.", { chunk_id: "required" });
      }

      const replicas = await repository.listReplicas(chunkId);
      res.json(successResponse(SERVICE_NAME, req.requestId, replicas));
    } catch (error) {
      next(error);
    }
  });

  app.use((req, res) => {
    observability.log("warn", "Route not found", {
      requestId: req.requestId || randomUUID(),
      traceId: req.traceId,
      spanId: req.spanId,
      method: req.method,
      path: req.path
    });
    res.status(404).json(
      errorResponse(SERVICE_NAME, req.requestId || randomUUID(), "NOT_FOUND", "Route not found.", {})
    );
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    const statusCode = error.statusCode || 500;
    const code = error.code || "INTERNAL_SERVER_ERROR";
    const message = error.statusCode ? error.message : "Unexpected server error.";
    const details = error.details || {};

    observability.log("error", "Request failed", {
      requestId: req.requestId,
      traceId: req.traceId,
      spanId: req.spanId,
      method: req.method,
      path: req.path,
      statusCode,
      code,
      details
    });

    res.status(statusCode).json(errorResponse(SERVICE_NAME, req.requestId, code, message, details));
  });

  return app;
}

function validateCreateLocation(body) {
  const details = {};

  if (!body || typeof body.chunk_id !== "string" || body.chunk_id.trim() === "") {
    details.chunk_id = "chunk_id must be a non-empty string.";
  }

  if (!body || typeof body.node_id !== "string" || body.node_id.trim() === "") {
    details.node_id = "node_id must be a non-empty string.";
  }

  if (body?.status !== undefined && (typeof body.status !== "string" || body.status.trim() === "")) {
    details.status = "status must be a non-empty string when provided.";
  }

  if (
    body?.last_verified !== undefined &&
    (typeof body.last_verified !== "string" || Number.isNaN(Date.parse(body.last_verified)))
  ) {
    details.last_verified = "last_verified must be a valid ISO-8601 date string when provided.";
  }

  if (Object.keys(details).length > 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid chunk location payload.", details);
  }

  return {
    chunkId: body.chunk_id.trim(),
    nodeId: body.node_id.trim(),
    status: body.status?.trim() || "active",
    lastVerified: body.last_verified || new Date().toISOString()
  };
}

module.exports = {
  createApp
};
