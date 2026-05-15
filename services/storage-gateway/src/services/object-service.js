const crypto = require("crypto");
const path = require("path");
const { HttpError } = require("../../../../shared/http");

const CHUNK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function normalizeChunkId(value) {
  const chunkId = String(value || "").trim();
  if (!CHUNK_ID_PATTERN.test(chunkId)) {
    throw new HttpError(400, "INVALID_CHUNK_ID", "chunk_id must be 1-128 URL-safe characters");
  }
  return chunkId;
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function parseObjectBody(body, contentType = "application/octet-stream") {
  if (!Buffer.isBuffer(body)) {
    throw new HttpError(400, "INVALID_BODY", "Request body must contain chunk bytes");
  }

  if (contentType.includes("application/json")) {
    let payload;
    try {
      payload = JSON.parse(body.toString("utf8"));
    } catch (_error) {
      throw new HttpError(400, "INVALID_JSON", "JSON body could not be parsed");
    }

    if (typeof payload.content_base64 === "string") {
      return Buffer.from(payload.content_base64, "base64");
    }
    if (typeof payload.content === "string") {
      return Buffer.from(payload.content, "utf8");
    }
    throw new HttpError(
      400,
      "INVALID_JSON_BODY",
      "JSON uploads must include content_base64 or content"
    );
  }

  return body;
}

function objectPathFor(rootDir, chunkId) {
  const normalized = normalizeChunkId(chunkId);
  return path.join(rootDir, `${normalized}.bin`);
}

function buildObjectRecord({ chunkId, storagePath, buffer, contentType }) {
  return {
    chunk_id: normalizeChunkId(chunkId),
    content_type: contentType || "application/octet-stream",
    hash: hashBuffer(buffer),
    path: storagePath,
    size: buffer.length
  };
}

module.exports = {
  buildObjectRecord,
  hashBuffer,
  normalizeChunkId,
  objectPathFor,
  parseObjectBody
};
