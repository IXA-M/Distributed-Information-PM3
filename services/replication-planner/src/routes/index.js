const express = require("express");
const { asyncHandler } = require("../../../../shared/http");
const { createHealthController } = require("../controllers/health-controller");
const { createReplicationController } = require("../controllers/replication-controller");

function createReplicationPlannerRouter({ planner, readyCheck }) {
  const router = express.Router();
  const healthController = createHealthController({ readyCheck });
  const replicationController = createReplicationController({ planner });

  router.get("/health", healthController.health);
  router.get("/ready", asyncHandler(healthController.ready));
  router.post("/replication/plan", asyncHandler(replicationController.createPlan));

  return router;
}

module.exports = { createReplicationPlannerRouter };
