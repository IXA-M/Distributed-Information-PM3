module.exports = {
  apps: [
    {
      name: "storage-gateway",
      script: "services/storage-gateway/src/server.js",
      instances: process.env.WEB_CONCURRENCY || 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
        SERVICE_NAME: "storage-gateway"
      }
    }
  ]
};
