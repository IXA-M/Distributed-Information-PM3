const { MongoClient } = require("mongodb");

const { createApp } = require("./app");
const { createChunkRepository } = require("./repository");

async function createServer({ databaseUrl, port = 0 }) {
  const client = new MongoClient(databaseUrl);
  await client.connect();

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "") || "chunk_catalog";
  const collection = client.db(databaseName).collection("chunks");
  const repository = createChunkRepository(collection);
  await repository.init();

  const app = createApp({ repository });

  const server = await new Promise((resolve) => {
    const instance = app.listen(port, () => resolve(instance));
  });

  return {
    app,
    server,
    repository,
    client,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      await client.close();
    }
  };
}

module.exports = {
  createServer
};
