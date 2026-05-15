const { startTracing } = require("../../../shared/tracing");
const tracing = startTracing(process.env.SERVICE_NAME || "replication-planner");
const { intEnv, listEnv, stringEnv } = require("../../../shared/config");
const {
  connectProducer,
  createKafka,
  topic
} = require("../../../shared/kafka");
const { createLogger } = require("../../../shared/logger");
const { connectMongo, pingMongo } = require("../../../shared/mongo");
const { createReplicationPlannerApp } = require("./app");
const { createReplicationPlanModel } = require("./models/replication-plan-model");
const { createReplicationConsumerService } = require("./services/replication-consumer-service");
const { createPlanner } = require("./services/replication-planner-service");

const serviceName = stringEnv("SERVICE_NAME", "replication-planner");
const logger = createLogger(serviceName);

async function main() {
  const port = Number.parseInt(process.env.PORT || "3000", 10);
  const defaultFactor = intEnv("DEFAULT_REPLICATION_FACTOR", 3);
  const inputTopics = listEnv(
    "PLANNER_INPUT_TOPICS",
    "upload.completed,node.heartbeat.missed,integrity.failed"
  );
  const targetNodes = listEnv("DEFAULT_TARGET_NODES", "storage-node-a,storage-node-b,storage-node-c");
  const outputTopic = topic("REPLICATION_TASK_TOPIC", "replication.task.created");
  const dlqTopic = topic("REPLICATION_TASK_DLQ_TOPIC", "replication.task.created.DLQ");

  const { client: mongoClient, db } = await connectMongo(serviceName, logger);
  const replicationPlanModel = createReplicationPlanModel(db);
  await replicationPlanModel.ensureIndexes();
  await replicationPlanModel.ensureDefaultPolicy(defaultFactor);

  const kafka = createKafka(serviceName);
  const producer = await connectProducer(kafka);
  const consumer = kafka.consumer({
    groupId: stringEnv("KAFKA_GROUP_ID", "replication-planner-group")
  });

  const planner = createPlanner({
    dlqTopic,
    logger,
    outputTopic,
    producer,
    replicationPlanModel,
    serviceName,
    targetNodes
  });
  const replicationConsumerService = createReplicationConsumerService({
    consumer,
    inputTopics,
    logger,
    planner
  });
  await replicationConsumerService.start();

  const app = createReplicationPlannerApp({
    logger,
    planner,
    readyCheck: async () => {
      await pingMongo(db);
      return {
        database: "mongodb",
        input_topics: inputTopics,
        output_topic: outputTopic,
        kafka_producer: "ok",
        ...replicationConsumerService.getState()
      };
    },
    serviceName
  });

  const server = app.listen(port, () => {
    logger.info("service listening", { input_topics: inputTopics, output_topic: outputTopic, port });
  });

  async function shutdown(signal) {
    logger.info("shutdown requested", { signal });
    server.close(async () => {
      await replicationConsumerService.stop();
      await producer.disconnect();
      await mongoClient.close();
      await tracing.shutdown();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  logger.error("service failed to start", { error: error.message, stack: error.stack });
  process.exit(1);
});
