const { issueSecret } = require("../services/secretService");
const { successResponse, errorResponse } = require("../utils/response");

async function createSecret(req, res) {
  try {
    const { service, expiresInSeconds, scopes } = req.body;

    if (!service || typeof service !== "string") {
      const response = errorResponse(
        req,
        "VALIDATION_ERROR",
        "Field 'service' is required and must be a string.",
        { field: "service" },
        400
      );
      return res.status(response.statusCode).json(response.body);
    }

    if (expiresInSeconds && (!Number.isFinite(Number(expiresInSeconds)) || Number(expiresInSeconds) <= 0)) {
      const response = errorResponse(
        req,
        "VALIDATION_ERROR",
        "Field 'expiresInSeconds' must be a positive number.",
        { field: "expiresInSeconds" },
        400
      );
      return res.status(response.statusCode).json(response.body);
    }

    const data = await issueSecret({ service, expiresInSeconds, scopes });
    const response = successResponse(req, data, 201);
    return res.status(response.statusCode).json(response.body);
  } catch (error) {
    const response = errorResponse(
      req,
      "INTERNAL_ERROR",
      "Failed to issue secret.",
      { message: error.message },
      500
    );
    return res.status(response.statusCode).json(response.body);
  }
}

module.exports = {
  createSecret
};
