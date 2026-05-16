
// --- Added Auth and User Profile Services ---

// ecosystem.config.js  – used for local development with pm2
module.exports = {
  apps: [
    {
      name: 'auth-service',
      script: './auth-service/src/index.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/auth-error.log',
      out_file: './logs/auth-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'user-profile-service',
      script: './user-profile-service/src/index.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3002,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: './logs/profile-error.log',
      out_file: './logs/profile-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
