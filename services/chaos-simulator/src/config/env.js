const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 3002),
  serviceName: process.env.SERVICE_NAME || "chaos-simulator",
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27018",
  dbName: process.env.DB_NAME || "chaos_simulator_db",
  kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean),
  kafkaClientId: process.env.KAFKA_CLIENT_ID || "chaos-simulator-client"
};
