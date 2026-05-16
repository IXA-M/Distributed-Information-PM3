const { Kafka } = require('kafkajs');
const logger = require('../config/logger');

const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: { initialRetryTime: 300, retries: 10 },
});

const producer = kafka.producer();

async function connectKafka() {
  await producer.connect();
  logger.info('Kafka producer connected');
}

async function disconnectKafka() {
  await producer.disconnect();
}

/**
 * Publish user.registered event after successful registration.
 * Consumed by: User Profile Service (creates profile row),
 *              Roles Service (assigns default role).
 */
async function publishUserRegistered(user) {
  await producer.send({
    topic: 'user.registered',
    messages: [
      {
        key: String(user.id),
        value: JSON.stringify({
          event: 'user.registered',
          timestamp: new Date().toISOString(),
          data: {
            user_id: user.id,
            name: user.name,
            email: user.email,
          },
        }),
      },
    ],
  });
  logger.info(`Published user.registered for user_id=${user.id}`);
}

module.exports = { connectKafka, disconnectKafka, publishUserRegistered };
