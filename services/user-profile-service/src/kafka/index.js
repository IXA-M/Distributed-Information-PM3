const { Kafka } = require('kafkajs');
const logger = require('../config/logger');
const db = require('../config/database');

const kafka = new Kafka({
  clientId: 'user-profile-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: { initialRetryTime: 300, retries: 10 },
});

const consumer = kafka.consumer({ groupId: 'user-profile-group' });
const producer = kafka.producer();

async function connectKafka() {
  await producer.connect();
  await consumer.connect();

  await consumer.subscribe({ topic: 'user.registered', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        const { user_id } = payload.data;

        // Auto-create an empty profile row when a user registers
        await db.query(
          `INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
          [user_id]
        );
        logger.info(`Profile auto-created for user_id=${user_id}`);
      } catch (err) {
        logger.error('Error processing user.registered event', err);
      }
    },
  });

  logger.info('Kafka consumer listening on user.registered');
}

async function disconnectKafka() {
  await consumer.disconnect();
  await producer.disconnect();
}

/**
 * Publish profile.updated event.
 * Consumed by: Audit Log, Access Analytics.
 */
async function publishProfileUpdated(userId) {
  await producer.send({
    topic: 'profile.updated',
    messages: [
      {
        key: String(userId),
        value: JSON.stringify({
          event: 'profile.updated',
          timestamp: new Date().toISOString(),
          data: { user_id: userId },
        }),
      },
    ],
  });
  logger.info(`Published profile.updated for user_id=${userId}`);
}

module.exports = { connectKafka, disconnectKafka, publishProfileUpdated };
