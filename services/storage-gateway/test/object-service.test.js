const {
  buildObjectRecord,
  hashBuffer,
  normalizeChunkId,
  parseObjectBody
} = require("../src/services/object-service");

describe("object-service unit tests", () => {
  test("normalizeChunkId accepts safe ids", () => {
    expect(normalizeChunkId("chunk_01-A.bin")).toBe("chunk_01-A.bin");
  });

  test("normalizeChunkId rejects traversal values", () => {
    expect(() => normalizeChunkId("../secret")).toThrow(/chunk_id/);
  });

  test("parseObjectBody supports JSON base64 uploads", () => {
    const body = Buffer.from(JSON.stringify({ content_base64: Buffer.from("hello").toString("base64") }));
    expect(parseObjectBody(body, "application/json").toString("utf8")).toBe("hello");
  });

  test("buildObjectRecord calculates deterministic sha256", () => {
    const buffer = Buffer.from("chunk payload");
    const record = buildObjectRecord({
      buffer,
      chunkId: "chunk-99",
      contentType: "text/plain",
      storagePath: "/tmp/chunk-99.bin"
    });

    expect(record.hash).toBe(hashBuffer(buffer));
    expect(record.size).toBe(buffer.length);
    expect(record.chunk_id).toBe("chunk-99");
  });

  test("parseObjectBody supports JSON text uploads", () => {
    const body = Buffer.from(JSON.stringify({ content: "hello text" }));
    expect(parseObjectBody(body, "application/json").toString("utf8")).toBe("hello text");
  });

  test("parseObjectBody rejects invalid JSON uploads", () => {
    expect(() => parseObjectBody(Buffer.from("{"), "application/json")).toThrow(/JSON body/);
  });
});
