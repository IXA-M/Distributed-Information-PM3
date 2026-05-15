const { createServer } = require("./start");
const { createObservability } = require("./observability");

const port = Number(process.env.PORT || 3002);
const databaseUrl = process.env.DATABASE_URL || "mongodb://localhost:27018/chunk_location";
const observability = createObservability("chunk-location");

async function start() {
  await createServer({ databaseUrl, port, observability });
  observability.log("info", "Server started", { port });
}

start().catch((error) => {
  observability.log("error", "Failed to start chunk-location", {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});
