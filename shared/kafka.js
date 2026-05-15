const crypto = require("crypto");
const { Kafka, logLevel } = require("kafkajs");
const { listEnv, stringEnv } = require("./config");

function createKafka(serviceName) {
  const brokers = listEnv("KAFKA_BROKERS", "localhost:9092");
  return new Kafka({
    brokers,
    clientId: serviceName,
    logLevel: logLevel.NOTHING,
    retry: {
      initialRetryTime: 300,
      retries: 8
    }
  });
}

async function connectProducer(kafka) {
  const producer = kafka.producer({ allowAutoTopicCreation: true });
  await producer.connect();
  return producer;
}

function makeEvent(eventType, serviceName, data, extra = {}) {
  return {
    event_id: crypto.randomUUID(),
    event_type: eventType,
    occurred_at: new Date().toISOString(),
    producer: serviceName,
    data,
    ...extra
  };
}

async function publishJson(producer, topic, event, key) {
  await producer.send({
    topic,
    messages: [
      {
        key: key ? String(key) : event.event_id,
        value: JSON.stringify(event),
        headers: {
          "content-type": "application/json",
          "event-type": event.event_type || ""
        }
      }
    ]
  });
}

function parseKafkaMessage(message) {
  if (!message || !message.value) {
    throw new Error("Kafka message value is empty");
  }
  return JSON.parse(message.value.toString("utf8"));
}

function topic(name, fallback) {
  return stringEnv(name, fallback);
}

module.exports = {
  connectProducer,
  createKafka,
  makeEvent,
  parseKafkaMessage,
  publishJson,
  topic
};
