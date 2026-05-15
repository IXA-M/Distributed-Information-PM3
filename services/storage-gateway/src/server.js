const { startTracing } = require("../../../shared/tracing");
const tracing = startTracing(process.env.SERVICE_NAME || "storage-gateway");
const path = require("path");
const { stringEnv } = require("../../../shared/config");
const { createLogger } = require("../../../shared/logger");
const { connectProducer, createKafka, topic } = require("../../../shared/kafka");
const { connectMongo, pingMongo } = require("../../../shared/mongo");
const { createObjectModel } = require("./models/object-model");
const { createStorageGatewayApp } = require("./app");
const { createChunkEventPublisher } = require("./services/chunk-event-publisher");

const serviceName = stringEnv("SERVICE_NAME", "storage-gateway");
const logger = createLogger(serviceName);

async function main() {
  const port = Number.parseInt(process.env.PORT || "3000", 10);
  const storageRoot = stringEnv(
    "OBJECT_STORAGE_ROOT",
    path.join(process.cwd(), "object-data", "storage-gateway")
  );

  const { client: mongoClient, db } = await connectMongo(serviceName, logger);
  const objectModel = createObjectModel(db);
  await objectModel.ensureIndexes();

  const kafka = createKafka(serviceName);
  const producer = await connectProducer(kafka);
  const chunkStoredTopic = topic("CHUNK_STORED_TOPIC", "chunk.stored");
  const publisher = createChunkEventPublisher({ chunkStoredTopic, logger, producer, serviceName });

  const app = createStorageGatewayApp({
    logger,
    publisher,
    readyCheck: async () => {
      await pingMongo(db);
      return { database: "mongodb", kafka_producer: "ok", storage_root: storageRoot };
    },
    objectModel,
    serviceName,
    storageRoot
  });

  const server = app.listen(port, () => {
    logger.info("service listening", { port, storage_root: storageRoot });
  });

  async function shutdown(signal) {
    logger.info("shutdown requested", { signal });
    server.close(async () => {
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
