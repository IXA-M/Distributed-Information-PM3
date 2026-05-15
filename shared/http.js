const crypto = require("crypto");

class HttpError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function requestContext(serviceName) {
  return (req, res, next) => {
    const requestId = req.get("x-request-id") || crypto.randomUUID();
    req.context = { requestId, serviceName };
    res.setHeader("x-request-id", requestId);
    next();
  };
}

function success(req, res, data = {}, status = 200) {
  res.status(status).json({
    success: true,
    data,
    meta: {
      service: req.context.serviceName,
      request_id: req.context.requestId
    }
  });
}

function failure(req, res, error) {
  const status = error.status || 500;
  const code = error.code || "INTERNAL_ERROR";
  res.status(status).json({
    success: false,
    error: {
      code,
      message: error.message || "Unexpected error",
      details: error.details || {}
    },
    meta: {
      service: req.context.serviceName,
      request_id: req.context.requestId
    }
  });
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function notFound(req, res, next) {
  next(new HttpError(404, "NOT_FOUND", `No route for ${req.method} ${req.path}`));
}

function errorHandler(logger) {
  return (err, req, res, _next) => {
    if (!err.status || err.status >= 500) {
      logger.error("request failed", {
        error: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path,
        request_id: req.context && req.context.requestId
      });
    }
    failure(req, res, err);
  };
}

module.exports = {
  HttpError,
  asyncHandler,
  errorHandler,
  notFound,
  requestContext,
  success
};
