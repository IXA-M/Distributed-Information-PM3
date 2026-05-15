const fs = require("fs/promises");
const path = require("path");
const { HttpError } = require("../../../../shared/http");
const {
  buildObjectRecord,
  normalizeChunkId,
  objectPathFor,
  parseObjectBody
} = require("./object-service");

function createObjectStorageService({ objectModel, publisher, storageRoot }) {
  return {
    async storeObject({ body, chunkId, contentType, requestId }) {
      const normalizedChunkId = normalizeChunkId(chunkId);
      const buffer = parseObjectBody(body, contentType);
      if (buffer.length === 0) {
        throw new HttpError(400, "EMPTY_OBJECT", "Uploaded object body cannot be empty");
      }

      const storagePath = objectPathFor(storageRoot, normalizedChunkId);
      await fs.mkdir(path.dirname(storagePath), { recursive: true });
      await fs.writeFile(storagePath, buffer);

      const record = buildObjectRecord({
        buffer,
        chunkId: normalizedChunkId,
        contentType,
        storagePath
      });
      const saved = await objectModel.save(record);

      await publisher.publishChunkStored(saved, requestId);

      return {
        chunk_id: saved.chunk_id,
        size: saved.size,
        hash: saved.hash,
        content_type: saved.content_type,
        stored_at: saved.updated_at
      };
    },

    async getObject({ chunkId, raw }) {
      const normalizedChunkId = normalizeChunkId(chunkId);
      const record = await objectModel.findByChunkId(normalizedChunkId);
      if (!record) {
        throw new HttpError(404, "OBJECT_NOT_FOUND", "Chunk object was not found", {
          chunk_id: normalizedChunkId
        });
      }

      const buffer = await fs.readFile(record.path);
      if (raw) {
        return {
          raw: true,
          buffer,
          content_type: record.content_type,
          hash: record.hash,
          size: record.size
        };
      }

      return {
        chunk_id: record.chunk_id,
        size: record.size,
        hash: record.hash,
        content_type: record.content_type,
        content_base64: buffer.toString("base64")
      };
    }
  };
}

module.exports = { createObjectStorageService };
