const request = require("supertest");
const path = require("path");
const YAML = require("yamljs");

const { createApp } = require("../src/app");

function createRepository() {
  const chunks = [];

  return {
    async ping() {
      return true;
    },
    async createChunk({ fileId, chunkNo, hash, size }) {
      const existing = chunks.find((chunk) => chunk.file_id === fileId && chunk.chunk_no === chunkNo);
      if (existing) {
        const error = new Error("duplicate");
        error.statusCode = 409;
        error.code = "CHUNK_ALREADY_EXISTS";
        error.details = { file_id: fileId, chunk_no: chunkNo };
        throw error;
      }

      const chunk = {
        id: `chunk-${chunks.length + 1}`,
        file_id: fileId,
        chunk_no: chunkNo,
        hash,
        size,
        created_at: new Date().toISOString()
      };

      chunks.push(chunk);
      return chunk;
    },
    async listByFileId(fileId) {
      return chunks.filter((chunk) => chunk.file_id === fileId);
    }
  };
}

describe("chunk-catalog app", () => {
  test("returns health response in standard format", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "ok" },
      meta: { service: "chunk-catalog" }
    });
    expect(response.body.meta.request_id).toBeDefined();
  });

  test("creates a chunk", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app).post("/chunks").send({
      file_id: "file-1",
      chunk_no: 0,
      hash: "abc123",
      size: 512
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.file_id).toBe("file-1");
  });

  test("preserves x-request-id in responses", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app)
      .post("/chunks")
      .set("x-request-id", "req-123")
      .send({
        file_id: "file-1",
        chunk_no: 0,
        hash: "abc123",
        size: 512
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.meta.request_id).toBe("req-123");
  });

  test("rejects invalid chunk payloads", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app).post("/chunks").send({
      file_id: "",
      chunk_no: -1,
      hash: "",
      size: -5
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toMatchObject({
      file_id: expect.any(String),
      chunk_no: expect.any(String),
      hash: expect.any(String),
      size: expect.any(String)
    });
  });

  test("rejects duplicate chunks for the same file and chunk number", async () => {
    const app = createApp({ repository: createRepository() });
    const payload = {
      file_id: "file-1",
      chunk_no: 0,
      hash: "abc123",
      size: 512
    };

    await request(app).post("/chunks").send(payload);
    const response = await request(app).post("/chunks").send(payload);

    expect(response.statusCode).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("CHUNK_ALREADY_EXISTS");
  });

  test("lists chunks by file id", async () => {
    const repository = createRepository();
    const app = createApp({ repository });

    await repository.createChunk({
      fileId: "file-1",
      chunkNo: 0,
      hash: "abc123",
      size: 512
    });

    const response = await request(app).get("/chunks").query({ file_id: "file-1" });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
  });

  test("requires file_id query parameter when listing chunks", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app).get("/chunks");

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("returns ready when repository ping succeeds", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app).get("/ready");

    expect(response.statusCode).toBe(200);
    expect(response.body.data.status).toBe("ready");
  });

  test("returns not ready when repository ping fails", async () => {
    const app = createApp({
      repository: {
        ...createRepository(),
        async ping() {
          throw new Error("db down");
        }
      }
    });

    const response = await request(app).get("/ready");

    expect(response.statusCode).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("SERVICE_NOT_READY");
  });

  test("exposes prometheus metrics", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app).get("/metrics");

    expect(response.statusCode).toBe(200);
    expect(response.text).toContain("http_requests_total");
    expect(response.text).toContain("http_request_duration_seconds");
  });

  test("exposes swagger ui at /api-docs and redirects /docs", async () => {
    const app = createApp({ repository: createRepository() });

    const docsResponse = await request(app).get("/docs");
    const swaggerResponse = await request(app).get("/api-docs/");

    expect(docsResponse.statusCode).toBe(302);
    expect(docsResponse.headers.location).toBe("/api-docs");
    expect(swaggerResponse.statusCode).toBe(200);
    expect(swaggerResponse.text).toContain("Swagger UI");
  });

  test("documents all endpoints, schemas, and error responses in OpenAPI", () => {
    const spec = YAML.load(path.join(__dirname, "..", "openapi.yaml"));

    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining(["/docs", "/api-docs", "/health", "/ready", "/metrics", "/chunks", "/{unknownRoute}"])
    );
    expect(spec.paths["/chunks"].post.requestBody.content["application/json"].schema.$ref).toBe(
      "#/components/schemas/CreateChunkRequest"
    );
    expect(Object.keys(spec.paths["/chunks"].post.responses)).toEqual(
      expect.arrayContaining(["201", "400", "409", "500"])
    );
    expect(Object.keys(spec.paths["/chunks"].get.responses)).toEqual(expect.arrayContaining(["200", "400", "500"]));
    expect(spec.paths["/{unknownRoute}"].get.responses["404"]).toBeDefined();
    expect(spec.components.schemas.ErrorResponse).toBeDefined();
  });

  test("returns standard 404 response for unknown routes", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app).get("/missing");

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
