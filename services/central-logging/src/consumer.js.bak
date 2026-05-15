const { Kafka } = require("kafkajs");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

const kafka = new Kafka({
  clientId: "central-logging",
  brokers: [(process.env.KAFKA_BROKER || "localhost:9092")],
  retry: {
    initialRetryTime: 500,
    retries: 8
  }
});

const consumer = kafka.consumer({ groupId: "central-logging-group" });

/**
 * Determine log level and extract a human-readable message
 * based on which Kafka topic the event came from.
 */
function normalizeEvent(topic, event) {
  switch (topic) {

    case "audit.event":
      return {
        service: event.service || "unknown",
        level: "info",
        message: `[AUDIT] actor=${event.actor} action=${event.action} entity=${event.entity}`
      };

    case "gc.completed":
      return {
        service: "garbage-collector",
        level: "info",
        message: `[GC] Run completed — deleted ${event.deleted_count ?? 0} orphan chunks`
      };

    case "chaos.rule.activated":
      return {
        service: "chaos-simulator",
        level: "warn",
        message: `[CHAOS] Rule activated — target=${event.target_service} type=${event.type}`
      };

    default:
      return {
        service: event.service || "unknown",
        level: "info",
        message: `[${topic}] Event received`
      };
  }
}

function saveLog(topic, service, level, message, payload) {
  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO logs (id, service, level, topic, message, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, service, level, topic, message, payload ? JSON.stringify(payload) : null);

    console.log(`[CentralLog] Saved: [${level.toUpperCase()}] ${message}`);
  } catch (err) {
    console.error("[CentralLog] DB insert failed:", err.message);
  }
}

async function startConsumer() {
  try {
    await consumer.connect();
    console.log("[Kafka] Central Logging consumer connected");

    // Subscribe to all 3 topics
    await consumer.subscribe({ topic: "audit.event",          fromBeginning: false });
    await consumer.subscribe({ topic: "gc.completed",         fromBeginning: false });
    await consumer.subscribe({ topic: "chaos.rule.activated", fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        try {
          const event = JSON.parse(raw);
          const { service, level, message: msg } = normalizeEvent(topic, event);
          saveLog(topic, service, level, msg, event);

        } catch (parseErr) {
          console.error("[CentralLog] Failed to parse message:", parseErr.message);
          // Still save it as a raw error log
          saveLog(topic, "unknown", "error", "Failed to parse event payload", { raw });
        }
      }
    });

  } catch (err) {
    console.error("[Kafka] Consumer failed to start:", err.message);
    setTimeout(startConsumer, 5000);
  }
}

async function stopConsumer() {
  await consumer.disconnect();
}

module.exports = { startConsumer, stopConsumer };
