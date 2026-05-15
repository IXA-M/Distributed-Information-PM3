module.exports = {
  apps: [
    {
      name: "replication-planner",
      script: "services/replication-planner/src/worker.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
        SERVICE_NAME: "replication-planner"
      }
    }
  ]
};
