const { Kafka, Partitioners } = require("kafkajs");
const env = require("./env");

const kafka = new Kafka({
  clientId: env.kafkaClientId,
  brokers: env.kafkaBrokers
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner
});

let producerConnected = false;

async function connectKafka() {
  await producer.connect();
  producerConnected = true;
}

async function disconnectKafka() {
  if (!producerConnected) {
    return;
  }

  await producer.disconnect();
  producerConnected = false;
}

async function publishChaosRuleActivated(event) {
  await producer.send({
    topic: "chaos.rule.activated",
    messages: [
      {
        key: `${event.service}:${event.type}`,
        value: JSON.stringify(event)
      }
    ]
  });
}

function getKafkaStatus() {
  return {
    producerConnected
  };
}

module.exports = {
  connectKafka,
  disconnectKafka,
  publishChaosRuleActivated,
  getKafkaStatus
};
