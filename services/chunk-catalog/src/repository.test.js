const { createChunkRepository } = require("./repository");
describe("chunk-catalog repository", () => {
  test("creates the indexes required by the diagram", async () => {
    const createIndex = jest.fn().mockResolvedValue();
    const repository = createChunkRepository({
      createIndex
    });

    await repository.init();

    expect(createIndex).toHaveBeenNthCalledWith(1, { file_id: 1, chunk_no: 1 }, { unique: true });
    expect(createIndex).toHaveBeenNthCalledWith(2, { file_id: 1 });
  });

  test("maps inserted chunks with Mongo ObjectId-backed ids", async () => {
    const insertOne = jest.fn().mockResolvedValue({ acknowledged: true });
    const repository = createChunkRepository({
      insertOne
    });

    const chunk = await repository.createChunk({
      fileId: "file-1",
      chunkNo: 2,
      hash: "abc123",
      size: 4096
    });

    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(Object),
        file_id: "file-1",
        chunk_no: 2,
        hash: "abc123",
        size: 4096,
        created_at: expect.any(Date)
      })
    );
    expect(chunk).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        file_id: "file-1",
        chunk_no: 2,
        hash: "abc123",
        size: 4096,
        created_at: expect.any(String)
      })
    );
  });

  test("translates duplicate chunk conflicts", async () => {
    const repository = createChunkRepository({
      insertOne: jest.fn().mockRejectedValue({ code: 11000 })
    });

    await expect(
      repository.createChunk({
        fileId: "file-1",
        chunkNo: 2,
        hash: "abc123",
        size: 4096
      })
    ).rejects.toEqual(
      expect.objectContaining({
        statusCode: 409,
        code: "CHUNK_ALREADY_EXISTS"
      })
    );
  });
});
