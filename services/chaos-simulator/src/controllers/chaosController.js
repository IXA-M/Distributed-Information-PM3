const { upsertChaosRule } = require("../services/chaosService");
const { successResponse, errorResponse } = require("../utils/response");
const { publishChaosRuleActivated } = require("../config/kafka");

function validatePayload(type, body) {
  if (!body.service || typeof body.service !== "string") {
    return "Field 'service' is required and must be a string.";
  }

  if (!body.value || typeof body.value !== "object") {
    return "Field 'value' is required and must be an object.";
  }

  if (type === "latency") {
    const delayMs = Number(body.value.delayMs);
    if (!Number.isFinite(delayMs) || delayMs < 0) {
      return "Latency value must include a non-negative 'delayMs' number.";
    }
  }

  if (type === "error-rate") {
    const percentage = Number(body.value.percentage);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      return "Error rate value must include a 'percentage' number between 0 and 100.";
    }
  }

  return null;
}

async function createRule(req, res, type) {
  try {
    const validationError = validatePayload(type, req.body);
    if (validationError) {
      const response = errorResponse(req, "VALIDATION_ERROR", validationError, {}, 400);
      return res.status(response.statusCode).json(response.body);
    }

    const data = await upsertChaosRule({
      service: req.body.service,
      type,
      value: req.body.value,
      enabled: req.body.enabled
    });

    const response = successResponse(req, data, 201);
    res.status(response.statusCode).json(response.body);

    if (data.enabled) {
      setImmediate(() => {
        publishChaosRuleActivated({
          id: data.id,
          service: data.service,
          type: data.type,
          value: data.value,
          enabled: data.enabled,
          updated_at: new Date(data.updated_at).toISOString()
        }).catch((error) => {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            service: req.serviceName,
            request_id: req.requestId,
            level: "error",
            message: `failed to publish ${type} event`,
            error: error.message
          }));
        });
      });
    }

    return undefined;
  } catch (error) {
    const response = errorResponse(
      req,
      "INTERNAL_ERROR",
      `Failed to configure ${type} rule.`,
      { message: error.message },
      500
    );
    return res.status(response.statusCode).json(response.body);
  }
}

async function createLatencyRule(req, res) {
  return createRule(req, res, "latency");
}

async function createErrorRateRule(req, res) {
  return createRule(req, res, "error-rate");
}

module.exports = {
  createLatencyRule,
  createErrorRateRule
};
