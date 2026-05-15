const { createChunkLocationRepository } = require("./repository");

describe("chunk-location repository", () => {
  test("creates the indexes required by the assignment model", async () => {
    const createIndex = jest.fn().mockResolvedValue();
    const repository = createChunkLocationRepository({
      createIndex
    });

    await repository.init();

    expect(createIndex).toHaveBeenNthCalledWith(1, { chunk_id: 1, node_id: 1 }, { unique: true });
    expect(createIndex).toHaveBeenNthCalledWith(2, { chunk_id: 1 });
    expect(createIndex).toHaveBeenNthCalledWith(3, { node_id: 1 });
  });

  test("stores each replica as its own chunk location record", async () => {
    const insertOne = jest.fn().mockResolvedValue({ acknowledged: true });

    const repository = createChunkLocationRepository({
      insertOne
    });

    const location = await repository.createLocation({
      chunkId: "chunk-1",
      nodeId: "node-a",
      status: "active",
      lastVerified: "2026-05-02T00:00:00.000Z"
    });

    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(Object),
        chunk_id: "chunk-1",
        node_id: "node-a",
        status: "active",
        last_verified: new Date("2026-05-02T00:00:00.000Z")
      })
    );
    expect(location).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        chunk_id: "chunk-1",
        node_id: "node-a",
        status: "active",
        last_verified: "2026-05-02T00:00:00.000Z"
      })
    );
  });

  test("rejects duplicate nodes for the same chunk", async () => {
    const repository = createChunkLocationRepository({
      insertOne: jest.fn().mockRejectedValue({ code: 11000 })
    });

    await expect(
      repository.createLocation({
        chunkId: "chunk-1",
        nodeId: "node-a",
        status: "active",
        lastVerified: "2026-05-02T00:00:00.000Z"
      })
    ).rejects.toEqual(
      expect.objectContaining({
        statusCode: 409,
        code: "CHUNK_LOCATION_ALREADY_EXISTS"
      })
    );
  });

  test("lists replica nodes in verification order", async () => {
    const repository = createChunkLocationRepository({
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            {
              _id: { toString: () => "location-2" },
              chunk_id: "chunk-1",
              node_id: "node-a",
              status: "stale",
              last_verified: new Date("2026-05-02T01:00:00.000Z")
            },
            {
              _id: { toString: () => "location-1" },
              chunk_id: "chunk-1",
              node_id: "node-b",
              status: "active",
              last_verified: new Date("2026-05-02T02:00:00.000Z")
            }
          ])
        })
      })
    });

    await expect(repository.listReplicas("chunk-1")).resolves.toEqual([
      {
        node_id: "node-a",
        status: "stale",
        last_verified: "2026-05-02T01:00:00.000Z"
      },
      {
        node_id: "node-b",
        status: "active",
        last_verified: "2026-05-02T02:00:00.000Z"
      }
    ]);
  });
});
