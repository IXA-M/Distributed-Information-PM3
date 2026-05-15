const fs = require("fs");
const os = require("os");
const path = require("path");
const request = require("supertest");
const { createStorageGatewayApp } = require("../src/app");

describe("storage-gateway HTTP integration tests", () => {
  let database;
  let storageRoot;
  let app;

  beforeEach(() => {
    database = createTestDatabase();
    database.seed([]);
    storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "storage-gateway-test-"));
    app = createStorageGatewayApp({
      logger: silentLogger(),
      objectModel: database.objectModel,
      publisher: { async publishChunkStored() {} },
      readyCheck: async () => ({ database: "mongodb", kafka_producer: "ok" }),
      serviceName: "storage-gateway",
      storageRoot
    });
  });

  afterEach(() => {
    database.clean();
    fs.rmSync(storageRoot, { force: true, recursive: true });
  });

  test("GET /health returns ok", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ok");
  });

  test("GET /ready returns seeded dependency checks", async () => {
    const response = await request(app).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body.data.checks.database).toBe("mongodb");
  });

  test("PUT and GET /objects/{chunk_id} stores bytes", async () => {
    const put = await request(app)
      .put("/objects/chunk-int")
      .set("content-type", "text/plain")
      .send("hello");
    const get = await request(app).get("/objects/chunk-int");

    expect(put.status).toBe(201);
    expect(get.status).toBe(200);
    expect(Buffer.from(get.body.data.content_base64, "base64").toString("utf8")).toBe("hello");
  });

  test("GET /metrics exposes Prometheus text", async () => {
    await request(app).get("/health");
    const response = await request(app).get("/metrics");

    expect(response.status).toBe(200);
    expect(response.text).toMatch(/service_http_requests_total/);
  });

  test("GET /docs serves OpenAPI content", async () => {
    const response = await request(app).get("/docs");

    expect(response.status).toBe(200);
    expect(response.text).toMatch(/Storage Gateway API/);
  });
});

function createTestDatabase() {
  const records = new Map();
  return {
    seed(rows) {
      records.clear();
      for (const row of rows) {
        records.set(row.chunk_id, row);
      }
    },
    clean() {
      records.clear();
    },
    objectModel: {
      async findByChunkId(chunkId) {
        return records.get(chunkId) || null;
      },
      async save(record) {
        const saved = { ...record, updated_at: new Date() };
        records.set(saved.chunk_id, saved);
        return saved;
      }
    }
  };
}

function silentLogger() {
  return { debug() {}, error() {}, info() {}, warn() {} };
}
