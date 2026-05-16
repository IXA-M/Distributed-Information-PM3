const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 3001),
  serviceName: process.env.SERVICE_NAME || "secrets-broker",
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017",
  dbName: process.env.DB_NAME || "secrets_broker_db"
};
