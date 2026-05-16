const express = require("express");
const { asyncHandler } = require("../../../../shared/http");
const { createHealthController } = require("../controllers/health-controller");
const { createObjectController } = require("../controllers/object-controller");
const authenticate = require("../../../../shared/authenticate");

function createStorageGatewayRouter({ objectStorageService, readyCheck }) {
  const router = express.Router();
  const rawBody = express.raw({
    limit: process.env.MAX_OBJECT_BYTES || "50mb",
    type: "*/*"
  });
  const healthController = createHealthController({ readyCheck });
  const objectController = createObjectController({ objectStorageService });

  router.get("/health", healthController.health);
  router.get("/ready", asyncHandler(healthController.ready));
  router.put("/objects/:chunk_id", authenticate, rawBody, asyncHandler(objectController.putObject));
  router.get("/objects/:chunk_id", authenticate, asyncHandler(objectController.getObject));

  return router;
}

module.exports = { createStorageGatewayRouter };
