const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const { createServer } = require("../src/start");

describe("chunk-location integration", () => {
  let mongoServer;
  let runtime;
  let client;
  let database;
  let collection;
  let api;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    runtime = await createServer({
      databaseUrl: mongoServer.getUri("chunk_location"),
      port: 0
    });

    client = runtime.client;
    database = client.db("chunk_location");
    collection = database.collection("chunk_locations");
    const address = runtime.server.address();
    api = request(`http://127.0.0.1:${address.port}`);
  });

  beforeEach(async () => {
    await database.dropDatabase();
    await collection.createIndex({ chunk_id: 1, node_id: 1 }, { unique: true });
    await collection.createIndex({ chunk_id: 1 });
    await collection.createIndex({ node_id: 1 });
  });

  afterAll(async () => {
    await runtime.close();
    await mongoServer.stop();
  });

  test("creates and lists replica locations through real HTTP endpoints", async () => {
    await api.post("/chunk-locations").send({
      chunk_id: "chunk-1",
      node_id: "node-a",
      status: "active",
      last_verified: "2026-05-15T12:00:00.000Z"
    }).expect(201);

    await api.post("/chunk-locations").send({
      chunk_id: "chunk-1",
      node_id: "node-b",
      status: "stale",
      last_verified: "2026-05-15T13:00:00.000Z"
    }).expect(201);

    const response = await api.get("/chunks/chunk-1/replicas").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((item) => item.node_id)).toEqual(["node-a", "node-b"]);
  });

  test("returns a conflict when a duplicate replica is created", async () => {
    const payload = {
      chunk_id: "chunk-2",
      node_id: "node-a"
    };

    await api.post("/chunk-locations").send(payload).expect(201);
    const response = await api.post("/chunk-locations").send(payload).expect(409);

    expect(response.body.error.code).toBe("CHUNK_LOCATION_ALREADY_EXISTS");
  });

  test("reports ready against the real database connection", async () => {
    const response = await api.get("/ready").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ready");
  });

  test("returns prometheus metrics after handling traffic", async () => {
    await api.post("/chunk-locations").send({
      chunk_id: "chunk-metrics",
      node_id: "node-metrics"
    }).expect(201);

    const response = await api.get("/metrics").expect(200);

    expect(response.text).toContain("http_requests_total");
    expect(response.text).toContain("http_request_duration_seconds_bucket");
    expect(response.text).toContain('service="chunk-location"');
  });
});
