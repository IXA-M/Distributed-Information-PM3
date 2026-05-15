const { parseKafkaMessage } = require("../../../../shared/kafka");

function createReplicationConsumerService({ consumer, inputTopics, logger, planner }) {
  const state = {
    consumer_running: false
  };

  async function start() {
    await consumer.connect();
    for (const inputTopic of inputTopics) {
      await consumer.subscribe({ fromBeginning: false, topic: inputTopic });
    }

    await consumer.run({
      eachMessage: async ({ message, partition, topic: sourceTopic }) => {
        const sourceEventId = `${sourceTopic}-${partition}-${message.offset}`;
        let event;
        try {
          event = parseKafkaMessage(message);
          await planner.planFromEvent(sourceTopic, event, { sourceEventId });
        } catch (error) {
          logger.error("failed to process kafka event", {
            error: error.message,
            offset: message.offset,
            partition,
            source_topic: sourceTopic
          });
          await planner.publishDlq(sourceTopic, event || rawMessageOf(message), error, {
            sourceEventId
          });
        }
      }
    });

    state.consumer_running = true;
  }

  async function stop() {
    state.consumer_running = false;
    await consumer.disconnect();
  }

  function getState() {
    return { ...state };
  }

  return { getState, start, stop };
}

function rawMessageOf(message) {
  return {
    raw: message.value ? message.value.toString("utf8") : null
  };
}

module.exports = { createReplicationConsumerService };
