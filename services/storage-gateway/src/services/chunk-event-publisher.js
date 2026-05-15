const { makeEvent, publishJson } = require("../../../../shared/kafka");

function createChunkEventPublisher({ chunkStoredTopic, logger, producer, serviceName }) {
  return {
    async publishChunkStored(record, requestId) {
      const event = makeEvent(
        "chunk.stored",
        serviceName,
        {
          chunk_id: record.chunk_id,
          content_type: record.content_type,
          hash: record.hash,
          path: record.path,
          size: record.size
        },
        { request_id: requestId }
      );

      await publishJson(producer, chunkStoredTopic, event, record.chunk_id);
      logger.info("published chunk.stored", { chunk_id: record.chunk_id, topic: chunkStoredTopic });
    }
  };
}

module.exports = { createChunkEventPublisher };
