const { Kafka } = require("kafkajs");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

const kafka = new Kafka({
  clientId: "audit-log",
  brokers: [(process.env.KAFKA_BROKER || "localhost:9092")],
  retry: {
    initialRetryTime: 500,
    retries: 8
  }
});

// Consumer group: all replicas share work (each event processed once)
const consumer = kafka.consumer({ groupId: "audit-log-group" });

/**
 * Save an audit event to the database.
 * Called for every message consumed from audit.event topic.
 */
function saveAuditLog(actor, action, entity, details) {
  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, actor, action, entity, details, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(id, actor, action, entity, details ? JSON.stringify(details) : null);

    console.log(`[Audit] Logged: actor=${actor} action=${action} entity=${entity}`);
  } catch (err) {
    console.error("[Audit] DB insert failed:", err.message);
  }
}

async function startConsumer() {
  try {
    await consumer.connect();
    console.log("[Kafka] Audit Log consumer connected");

    // Subscribe to audit.event — published by ALL 40 services
    await consumer.subscribe({
      topic: "audit.event",
      fromBeginning: false  // only process new events after startup
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        try {
          const event = JSON.parse(raw);

          // Expected payload shape:
          // { actor, action, entity, details? }
          const { actor, action, entity, details } = event;

          if (!actor || !action || !entity) {
            console.warn("[Audit] Skipping malformed event:", raw);
            return;
          }

          saveAuditLog(actor, action, entity, details);

        } catch (parseErr) {
          console.error("[Audit] Failed to parse message:", parseErr.message);
        }
      }
    });

  } catch (err) {
    console.error("[Kafka] Consumer failed to start:", err.message);
    // Retry after 5 seconds — Kafka might not be ready yet
    setTimeout(startConsumer, 5000);
  }
}

async function stopConsumer() {
  await consumer.disconnect();
}

module.exports = { startConsumer, stopConsumer };
