const { ObjectId } = require("mongodb");

const { AppError } = require("./errors");

function createChunkRepository(collection) {
  return {
    async init() {
      await collection.createIndex({ file_id: 1, chunk_no: 1 }, { unique: true });
      await collection.createIndex({ file_id: 1 });
    },

    async ping() {
      await collection.db.admin().ping();
    },

    async createChunk({ fileId, chunkNo, hash, size }) {
      const chunk = {
        _id: new ObjectId(),
        file_id: fileId,
        chunk_no: chunkNo,
        hash,
        size,
        created_at: new Date()
      };

      try {
        await collection.insertOne(chunk);
        return mapChunk(chunk);
      } catch (error) {
        if (error.code === 11000) {
          throw new AppError(
            409,
            "CHUNK_ALREADY_EXISTS",
            "A chunk with this file_id and chunk_no already exists.",
            { file_id: fileId, chunk_no: chunkNo }
          );
        }

        throw error;
      }
    },

    async listByFileId(fileId) {
      const documents = await collection.find({ file_id: fileId }).sort({ chunk_no: 1 }).toArray();
      return documents.map(mapChunk);
    }
  };
}

function mapChunk(document) {
  return {
    id: document._id.toString(),
    file_id: document.file_id,
    chunk_no: document.chunk_no,
    hash: document.hash,
    size: document.size,
    created_at: toIsoString(document.created_at)
  };
}

function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : value;
}

module.exports = {
  createChunkRepository
};
