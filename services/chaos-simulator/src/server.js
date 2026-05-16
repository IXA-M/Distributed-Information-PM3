const { startTracing } = require("./tracing");
const tracing = startTracing(process.env.SERVICE_NAME || "chaos-simulator");
const app = require("./app");
const env = require("./config/env");
const { connectDatabase, mongoose } = require("./config/database");
const { connectKafka, disconnectKafka } = require("./config/kafka");

async function bootstrap() {
  await connectDatabase();
  await connectKafka();

  const server = app.listen(env.port, () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: env.serviceName,
      request_id: null,
      level: "info",
      message: "service listening",
      port: env.port
    }));
  });

  async function shutdown(signal) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: env.serviceName,
      request_id: null,
      level: "info",
      message: "shutdown requested",
      signal
    }));
    server.close(async () => {
      await disconnectKafka();
      await mongoose.disconnect();
      await tracing.shutdown();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: env.serviceName,
    request_id: null,
    level: "error",
    message: "startup failed",
    error: error.message,
    stack: error.stack
  }));
  process.exit(1);
});
