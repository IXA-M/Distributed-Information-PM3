const app = require("./app");
const { startConsumer, stopConsumer } = require("./consumer");

const PORT = process.env.PORT || 3025;

const server = app.listen(PORT, async () => {
  console.log("[Audit Log] HTTP server running on port " + PORT);
  await startConsumer();
});

process.on("SIGTERM", async () => {
  await stopConsumer();
  server.close(() => process.exit(0));
});

process.on("SIGINT", async () => {
  await stopConsumer();
  server.close(() => process.exit(0));
});
