const { ObjectId } = require("mongodb");

const { AppError } = require("./errors");

function createChunkLocationRepository(collection) {
  return {
    async init() {
      await collection.createIndex({ chunk_id: 1, node_id: 1 }, { unique: true });
      await collection.createIndex({ chunk_id: 1 });
      await collection.createIndex({ node_id: 1 });
    },

    async ping() {
      await collection.db.admin().ping();
    },

    async createLocation({ chunkId, nodeId, status, lastVerified }) {
      const verifiedAt = new Date(lastVerified);
      const location = {
        _id: new ObjectId(),
        chunk_id: chunkId,
        node_id: nodeId,
        status,
        last_verified: verifiedAt
      };

      try {
        await collection.insertOne(location);
        return mapLocation(location);
      } catch (error) {
        if (error.code === 11000) {
          throw new AppError(
            409,
            "CHUNK_LOCATION_ALREADY_EXISTS",
            "A replica for this chunk and node already exists.",
            { chunk_id: chunkId, node_id: nodeId }
          );
        }

        throw error;
      }
    },

    async listReplicas(chunkId) {
      const documents = await collection
        .find({ chunk_id: chunkId })
        .sort({ last_verified: 1, node_id: 1 })
        .toArray();

      return documents.map(mapReplica);
    }
  };
}

function mapLocation(document) {
  return {
    id: document._id.toString(),
    chunk_id: document.chunk_id,
    node_id: document.node_id,
    status: document.status,
    last_verified: toIsoString(document.last_verified)
  };
}

function mapReplica(document) {
  return {
    node_id: document.node_id,
    status: document.status,
    last_verified: toIsoString(document.last_verified)
  };
}

function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : value;
}

module.exports = {
  createChunkLocationRepository
};
