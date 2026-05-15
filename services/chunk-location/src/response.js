function successResponse(serviceName, requestId, data) {
  return {
    success: true,
    data,
    meta: {
      service: serviceName,
      request_id: requestId
    }
  };
}

function errorResponse(serviceName, requestId, code, message, details = {}) {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      service: serviceName,
      request_id: requestId
    }
  };
}

module.exports = {
  successResponse,
  errorResponse
};
