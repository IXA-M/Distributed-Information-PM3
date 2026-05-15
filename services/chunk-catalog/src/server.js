const { createServer } = require("./start");

const port = Number(process.env.PORT || 3001);
const databaseUrl = process.env.DATABASE_URL || "mongodb://localhost:27017/chunk_catalog";

async function start() {
  await createServer({ databaseUrl, port });
  console.log(`chunk-catalog listening on port ${port}`);
}

start().catch((error) => {
  console.error("Failed to start chunk-catalog", error);
  process.exit(1);
});
