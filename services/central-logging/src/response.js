function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      service: "central-logging",
      request_id: res.locals.requestId
    }
  });
}

function error(res, code, message, statusCode = 400, details = {}) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, details },
    meta: {
      service: "central-logging",
      request_id: res.locals.requestId
    }
  });
}

module.exports = { success, error };
