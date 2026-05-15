module.exports = {
  apps: [
    {
      name: "central-logging",
      script: "src/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
        PORT: 3026,
        KAFKA_BROKER: "kafka:9092",
        DB_PATH: "./data/central_logging.db"
      }
    }
  ]
};
