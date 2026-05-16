function successResponse(req, data, statusCode = 200) {
  return {
    statusCode,
    body: {
      success: true,
      data,
      meta: {
        service: req.serviceName,
        request_id: req.requestId
      }
    }
  };
}

function errorResponse(req, code, message, details = {}, statusCode = 400) {
  return {
    statusCode,
    body: {
      success: false,
      error: {
        code,
        message,
        details
      },
      meta: {
        service: req.serviceName || "unknown-service",
        request_id: req.requestId || "unknown-request"
      }
    }
  };
}

module.exports = {
  successResponse,
  errorResponse
};
