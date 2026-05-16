const crypto = require("crypto");

function requestContext(serviceName) {
  return (req, _res, next) => {
    req.requestId = req.header("x-request-id") || crypto.randomUUID();
    req.serviceName = serviceName;
    next();
  };
}

module.exports = requestContext;
