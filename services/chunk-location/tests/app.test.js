const request = require("supertest");

const { createApp } = require("../src/app");

function createRepository() {
  const locations = [];

  return {
    async ping() {
      return true;
    },
    async createLocation({ chunkId, nodeId, status = "active", lastVerified = new Date().toISOString() }) {
      const duplicate = locations.find((location) => location.chunk_id === chunkId && location.node_id === nodeId);

      if (duplicate) {
        const error = new Error("duplicate");
        error.statusCode = 409;
        error.code = "CHUNK_LOCATION_ALREADY_EXISTS";
        error.details = { chunk_id: chunkId, node_id: nodeId };
        throw error;
      }

      const location = {
        id: `location-${locations.length + 1}`,
        chunk_id: chunkId,
        node_id: nodeId,
        status,
        last_verified: lastVerified
      };

      locations.push(location);
      return location;
    },
    async listReplicas(chunkId) {
      return locations
        .filter((location) => location.chunk_id === chunkId)
        .sort((left, right) => new Date(left.last_verified).getTime() - new Date(right.last_verified).getTime())
        .map(({ node_id, status, last_verified }) => ({ node_id, status, last_verified }));
    }
  };
}

describe("chunk-location app", () => {
  test("returns health response in standard format", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "ok" },
      meta: { service: "chunk-location" }
    });
    expect(response.body.meta.request_id).toBeDefined();
  });

  test("creates a chunk location", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app).post("/chunk-locations").send({
      chunk_id: "4b0f3d0d-81e4-4531-a9d6-f5f3a44bd27c",
      node_id: "6f2d7567-6dba-44ec-90b4-d4e582a00ef4"
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.chunk_id).toBe("4b0f3d0d-81e4-4531-a9d6-f5f3a44bd27c");
    expect(response.body.data.node_id).toBe("6f2d7567-6dba-44ec-90b4-d4e582a00ef4");
  });

  test("preserves x-request-id in responses", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app)
      .post("/chunk-locations")
      .set("x-request-id", "req-456")
      .send({
        chunk_id: "4b0f3d0d-81e4-4531-a9d6-f5f3a44bd27c",
        node_id: "6f2d7567-6dba-44ec-90b4-d4e582a00ef4"
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.meta.request_id).toBe("req-456");
  });

  test("rejects invalid chunk location payloads", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app).post("/chunk-locations").send({
      chunk_id: "",
      node_id: ""
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toMatchObject({
      chunk_id: expect.any(String),
      node_id: expect.any(String)
    });
  });

  test("rejects duplicate chunk replica locations", async () => {
    const app = createApp({ repository: createRepository() });
    const payload = {
      chunk_id: "4b0f3d0d-81e4-4531-a9d6-f5f3a44bd27c",
      node_id: "6f2d7567-6dba-44ec-90b4-d4e582a00ef4"
    };

    await request(app).post("/chunk-locations").send(payload);
    const response = await request(app).post("/chunk-locations").send(payload);

    expect(response.statusCode).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("CHUNK_LOCATION_ALREADY_EXISTS");
  });

  test("lists replicas for a chunk", async () => {
    const repository = createRepository();
    const app = createApp({ repository });

    await repository.createLocation({
      chunkId: "4b0f3d0d-81e4-4531-a9d6-f5f3a44bd27c",
      nodeId: "6f2d7567-6dba-44ec-90b4-d4e582a00ef4"
    });

    const response = await request(app).get("/chunks/4b0f3d0d-81e4-4531-a9d6-f5f3a44bd27c/replicas");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
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

  test("returns standard 404 response for unknown routes", async () => {
    const app = createApp({ repository: createRepository() });

    const response = await request(app).get("/missing");

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
