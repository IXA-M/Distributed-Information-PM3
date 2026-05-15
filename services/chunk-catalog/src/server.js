const { createServer } = require("./start");
const { createObservability } = require("./observability");

const port = Number(process.env.PORT || 3001);
const databaseUrl = process.env.DATABASE_URL || "mongodb://localhost:27017/chunk_catalog";
const observability = createObservability("chunk-catalog");

async function start() {
  await createServer({ databaseUrl, port, observability });
  observability.log("info", "Server started", { port });
}

start().catch((error) => {
  observability.log("error", "Failed to start chunk-catalog", {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});
