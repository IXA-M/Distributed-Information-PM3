const { success } = require("../../../../shared/http");

function createReplicationController({ planner }) {
  return {
    async createPlan(req, res) {
      const sourceTopic =
        req.body.topic || req.body.source_topic || req.body.event_type || "manual.replication.plan";
      const event = req.body.event || req.body;
      const result = await planner.planFromEvent(sourceTopic, event, {
        requestId: req.context.requestId
      });

      success(req, res, result, 202);
    }
  };
}

module.exports = { createReplicationController };
