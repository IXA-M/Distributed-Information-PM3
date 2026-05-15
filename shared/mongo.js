const { MongoClient } = require("mongodb");
const { intEnv, stringEnv } = require("./config");

function mongoDbName(serviceName) {
  return stringEnv("MONGO_DB_NAME", serviceName.replace(/-/g, "_"));
}

function createMongoClient(serviceName) {
  if (!process.env.MONGO_URI) {
    throw new Error(`${serviceName} requires MONGO_URI`);
  }

  return new MongoClient(process.env.MONGO_URI, {
    appName: serviceName,
    maxPoolSize: intEnv("MONGO_POOL_SIZE", 10)
  });
}

async function connectMongo(serviceName, logger, attempts = 20) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const client = createMongoClient(serviceName);
    try {
      await client.connect();
      const db = client.db(mongoDbName(serviceName));
      await db.command({ ping: 1 });
      return { client, db };
    } catch (error) {
      lastError = error;
      await client.close().catch(() => {});
      logger.warn("waiting for mongodb", { attempt, error: error.message });
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * attempt, 5000)));
    }
  }
  throw lastError;
}

async function pingMongo(db) {
  await db.command({ ping: 1 });
}

module.exports = {
  connectMongo,
  mongoDbName,
  pingMongo
};
