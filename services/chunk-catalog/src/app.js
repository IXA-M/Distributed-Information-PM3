const express = require("express");
const { randomUUID } = require("crypto");

const { AppError } = require("./errors");
const { createObservability } = require("./observability");
const { successResponse, errorResponse } = require("./response");

const SERVICE_NAME = "chunk-catalog";

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

  app.post("/chunks", async (req, res, next) => {
    try {
      const payload = validateCreateChunk(req.body);
      const chunk = await repository.createChunk(payload);
      res
        .status(201)
        .json(successResponse(SERVICE_NAME, req.requestId, chunk));
    } catch (error) {
      next(error);
    }
  });

  app.get("/chunks", async (req, res, next) => {
    try {
      const fileId = req.query.file_id;
      if (!fileId || typeof fileId !== "string") {
        throw new AppError(400, "VALIDATION_ERROR", "file_id query parameter is required.", {
          file_id: "required"
        });
      }

      const chunks = await repository.listByFileId(fileId);
      res.json(successResponse(SERVICE_NAME, req.requestId, chunks));
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

function validateCreateChunk(body) {
  const details = {};

  if (!body || typeof body.file_id !== "string" || body.file_id.trim() === "") {
    details.file_id = "file_id must be a non-empty string.";
  }

  if (!Number.isInteger(body?.chunk_no) || body.chunk_no < 0) {
    details.chunk_no = "chunk_no must be an integer greater than or equal to 0.";
  }

  if (!body || typeof body.hash !== "string" || body.hash.trim() === "") {
    details.hash = "hash must be a non-empty string.";
  }

  if (!Number.isInteger(body?.size) || body.size < 0) {
    details.size = "size must be an integer greater than or equal to 0.";
  }

  if (Object.keys(details).length > 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid chunk payload.", details);
  }

  return {
    fileId: body.file_id.trim(),
    chunkNo: body.chunk_no,
    hash: body.hash.trim(),
    size: body.size
  };
}

module.exports = {
  createApp
};
