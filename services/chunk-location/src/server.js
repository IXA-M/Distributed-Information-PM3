const { createServer } = require("./start");

const port = Number(process.env.PORT || 3002);
const databaseUrl = process.env.DATABASE_URL || "mongodb://localhost:27018/chunk_location";

async function start() {
  await createServer({ databaseUrl, port });
  console.log(`chunk-location listening on port ${port}`);
}

start().catch((error) => {
  console.error("Failed to start chunk-location", error);
  process.exit(1);
});
