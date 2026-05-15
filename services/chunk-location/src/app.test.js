const request = require("supertest");

const { createApp } = require("./app");

describe("chunk-location app", () => {
  test("passes default status and last_verified to the repository", async () => {
    const repository = {
      ping: jest.fn().mockResolvedValue(),
      createLocation: jest.fn().mockResolvedValue({
        id: "location-1",
        chunk_id: "chunk-1",
        node_id: "node-a",
        status: "active",
        last_verified: "2026-05-02T00:00:00.000Z"
      }),
      listReplicas: jest.fn().mockResolvedValue([])
    };

    const app = createApp({ repository });

    const response = await request(app)
      .post("/chunk-locations")
      .send({ chunk_id: "chunk-1", node_id: "node-a" });

    expect(response.status).toBe(201);
    expect(repository.createLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        chunkId: "chunk-1",
        nodeId: "node-a",
        status: "active",
        lastVerified: expect.any(String)
      })
    );
  });

  test("rejects invalid last_verified values", async () => {
    const repository = {
      ping: jest.fn().mockResolvedValue(),
      createLocation: jest.fn(),
      listReplicas: jest.fn().mockResolvedValue([])
    };

    const app = createApp({ repository });

    const response = await request(app)
      .post("/chunk-locations")
      .send({ chunk_id: "chunk-1", node_id: "node-a", last_verified: "not-a-date" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(repository.createLocation).not.toHaveBeenCalled();
  });
});
