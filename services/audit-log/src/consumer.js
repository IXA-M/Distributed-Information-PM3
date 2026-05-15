const { Kafka } = require("kafkajs");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");
const { info, warn, error: logError } = require("./logger");

const kafka = new Kafka({
  clientId: "audit-log",
  brokers: [(process.env.KAFKA_BROKER || "localhost:9092")],
  retry: {
    initialRetryTime: 500,
    retries: 8
  }
});

const consumer = kafka.consumer({ groupId: "audit-log-group" });

function saveAuditLog(actor, action, entity, details) {
  const id = uuidv4();
  try {
    db.prepare(\
      INSERT INTO audit_logs (id, actor, action, entity, details, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    \).run(id, actor, action, entity, details ? JSON.stringify(details) : null);
    info(\Logged audit: \ \ \\, { actor, action, entity });
  } catch (err) {
    logError(\DB insert failed: \\, { actor, action, entity, error: err.message });
  }
}

async function startConsumer() {
  try {
    await consumer.connect();
    info("Kafka consumer connected", { broker: process.env.KAFKA_BROKER || "localhost:9092" });

    await consumer.subscribe({
      topic: "audit.event",
      fromBeginning: false
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        try {
          const event = JSON.parse(raw);
          const { actor, action, entity, details } = event;

          if (!actor || !action || !entity) {
            warn("Skipping malformed event", { raw });
            return;
          }

          saveAuditLog(actor, action, entity, details);
        } catch (parseErr) {
          logError("Failed to parse message", { error: parseErr.message });
        }
      }
    });
  } catch (err) {
    logError("Consumer failed to start", { error: err.message });
    setTimeout(startConsumer, 5000);
  }
}

async function stopConsumer() {
  await consumer.disconnect();
  info("Kafka consumer disconnected");
}

module.exports = { startConsumer, stopConsumer };
