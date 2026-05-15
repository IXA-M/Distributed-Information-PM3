const crypto = require("crypto");
const { makeEvent, publishJson } = require("../../../../shared/kafka");
const { buildReplicationTasks } = require("./plan-builder");

function createPlanner({ dlqTopic, logger, outputTopic, producer, replicationPlanModel, serviceName, targetNodes }) {
  async function planFromEvent(sourceTopic, event, context = {}) {
    const sourceEvent = event || {};
    const sourceEventId = sourceEvent.event_id || context.sourceEventId || crypto.randomUUID();
    const policy = await replicationPlanModel.getDefaultPolicy();
    const tasks = buildReplicationTasks({ event: sourceEvent, policy, sourceTopic, targetNodes });
    const run = await replicationPlanModel.recordRun({
      error: null,
      id: crypto.randomUUID(),
      source_event_id: sourceEventId,
      source_topic: sourceTopic,
      status: "planned",
      task_count: tasks.length,
      trigger_type: sourceEvent.event_type || sourceTopic
    });

    for (const task of tasks) {
      await publishJson(
        producer,
        outputTopic,
        makeEvent(
          "replication.task.created",
          serviceName,
          { ...task, plan_id: run.id, source_event_id: sourceEventId },
          { correlation_id: sourceEventId, request_id: context.requestId || null }
        ),
        task.chunk_id
      );
    }

    logger.info("replication plan created", {
      plan_id: run.id,
      source_event_id: sourceEventId,
      source_topic: sourceTopic,
      task_count: tasks.length
    });

    return {
      plan_id: run.id,
      source_event_id: sourceEventId,
      source_topic: sourceTopic,
      task_count: tasks.length,
      tasks
    };
  }

  async function publishDlq(sourceTopic, event, error, context = {}) {
    const sourceEvent = event || {};
    const sourceEventId = sourceEvent.event_id || context.sourceEventId || crypto.randomUUID();
    await replicationPlanModel.recordRun({
      error: error.message,
      id: crypto.randomUUID(),
      source_event_id: sourceEventId,
      source_topic: sourceTopic,
      status: "failed",
      task_count: 0,
      trigger_type: sourceEvent.event_type || sourceTopic
    });

    await publishJson(
      producer,
      dlqTopic,
      makeEvent("replication.task.created.DLQ", serviceName, {
        error: error.message,
        source_event: sourceEvent,
        source_topic: sourceTopic
      }),
      sourceEventId
    );
  }

  return { planFromEvent, publishDlq };
}

module.exports = { createPlanner };
