const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { createServer } = require("../src/start");

jest.mock("../../../shared/authenticate", () => (req, res, next) => {
  req.userId = "test-user";
  next();
});

describe("chunk-catalog integration", () => {
  let mongoServer;
  let runtime;
  let client;
  let database;
  let collection;
  let api;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    runtime = await createServer({
      databaseUrl: mongoServer.getUri("chunk_catalog"),
      port: 0
    });

    client = runtime.client;
    database = client.db("chunk_catalog");
    collection = database.collection("chunks");
    const address = runtime.server.address();
    api = request(`http://127.0.0.1:${address.port}`);
  });

  beforeEach(async () => {
    await database.dropDatabase();
    await collection.createIndex({ file_id: 1, chunk_no: 1 }, { unique: true });
    await collection.createIndex({ file_id: 1 });
  });

  afterAll(async () => {
    await runtime.close();
    await mongoServer.stop();
  });

  test("creates and lists chunks through real HTTP endpoints", async () => {
    await api.post("/chunks").send({
      file_id: "file-1",
      chunk_no: 0,
      hash: "hash-0",
      size: 128
    }).expect(201);

    await api.post("/chunks").send({
      file_id: "file-1",
      chunk_no: 1,
      hash: "hash-1",
      size: 256
    }).expect(201);

    const response = await api.get("/chunks").query({ file_id: "file-1" }).expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((item) => item.chunk_no)).toEqual([0, 1]);
  });

  test("returns a conflict when a duplicate chunk is created", async () => {
    const payload = {
      file_id: "file-2",
      chunk_no: 3,
      hash: "hash-3",
      size: 512
    };

    await api.post("/chunks").send(payload).expect(201);
    const response = await api.post("/chunks").send(payload).expect(409);

    expect(response.body.error.code).toBe("CHUNK_ALREADY_EXISTS");
  });

  test("reports ready against the real database connection", async () => {
    const response = await api.get("/ready").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ready");
  });

  test("returns prometheus metrics after handling traffic", async () => {
    await api.post("/chunks").send({
      file_id: "file-metrics",
      chunk_no: 0,
      hash: "hash-metrics",
      size: 64
    }).expect(201);

    const response = await api.get("/metrics").expect(200);

    expect(response.text).toContain("http_requests_total");
    expect(response.text).toContain("http_request_duration_seconds_bucket");
    expect(response.text).toContain('service="chunk-catalog"');
  });
});
