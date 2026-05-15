function createObjectModel(db) {
  const collection = db.collection("objects");

  return {
    async ensureIndexes() {
      await collection.createIndex({ hash: 1 });
      await collection.createIndex({ updated_at: -1 });
    },

    async save(record) {
      const now = new Date();
      await collection.updateOne(
        { _id: record.chunk_id },
        {
          $set: {
            content_type: record.content_type,
            hash: record.hash,
            path: record.path,
            size: record.size,
            updated_at: now
          },
          $setOnInsert: {
            created_at: now
          }
        },
        { upsert: true }
      );

      return this.findByChunkId(record.chunk_id);
    },

    async findByChunkId(chunkId) {
      const doc = await collection.findOne({ _id: chunkId });
      return doc ? mapDocument(doc) : null;
    }
  };
}

function mapDocument(doc) {
  return {
    chunk_id: doc._id,
    content_type: doc.content_type,
    created_at: doc.created_at,
    hash: doc.hash,
    path: doc.path,
    size: Number(doc.size),
    updated_at: doc.updated_at
  };
}

module.exports = { createObjectModel };
