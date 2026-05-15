require('./tracing');
require('./tracing');
const app = require("./app");
const { startConsumer, stopConsumer } = require("./consumer");
const { info, error } = require("./logger");

const PORT = process.env.PORT || 3026;

const server = app.listen(PORT, async () => {
  info(\HTTP server running on port \\);
  await startConsumer();
});

process.on("SIGTERM", async () => {
  info("SIGTERM received, shutting down gracefully");
  await stopConsumer();
  server.close(() => process.exit(0));
});

process.on("SIGINT", async () => {
  info("SIGINT received, shutting down gracefully");
  await stopConsumer();
  server.close(() => process.exit(0));
});


