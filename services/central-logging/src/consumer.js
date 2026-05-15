const { Kafka } = require("kafkajs");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");
const { info, warn, error: logError } = require("./logger");

const kafka = new Kafka({
  clientId: "central-logging",
  brokers: [(process.env.KAFKA_BROKER || "localhost:9092")],
  retry: {
    initialRetryTime: 500,
    retries: 8
  }
});

const consumer = kafka.consumer({ groupId: "central-logging-group" });

function normalizeEvent(topic, event) {
  switch (topic) {
    case "audit.event":
      return {
        service: event.service || "unknown",
        level: "info",
        message: [AUDIT] actor=\ action=\ entity=\
      };
    case "gc.completed":
      return {
        service: "garbage-collector",
        level: "info",
        message: [GC] Run completed — deleted \ orphan chunks
      };
    case "chaos.rule.activated":
      return {
        service: "chaos-simulator",
        level: "warn",
        message: [CHAOS] Rule activated — target=\ type=\
      };
    default:
      return {
        service: event.service || "unknown",
        level: "info",
        message: [\] Event received
      };
  }
}

function saveLog(topic, service, level, message, payload) {
  const id = uuidv4();
  try {
    db.prepare(\
      INSERT INTO logs (id, service, level, topic, message, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    \).run(id, service, level, topic, message, payload ? JSON.stringify(payload) : null);
    info(\Saved log: \\, { topic, service, level });
  } catch (err) {
    logError(\DB insert failed: \\, { topic, service, level, error: err.message });
  }
}

async function startConsumer() {
  try {
    await consumer.connect();
    info("Kafka consumer connected", { broker: process.env.KAFKA_BROKER || "localhost:9092" });

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
          logError("Failed to parse message", { topic, error: parseErr.message, raw });
          saveLog(topic, "unknown", "error", "Failed to parse event payload", { raw });
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
