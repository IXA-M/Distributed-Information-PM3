const { createLogger, format, transports } = require('winston');

module.exports = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  defaultMeta: { service: 'user-profile-service' },
  transports: [new transports.Console()],
});
