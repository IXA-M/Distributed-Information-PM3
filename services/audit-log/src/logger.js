const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    service: 'audit-log',
    level,
    message,
    ...meta
  };
  console.log(JSON.stringify(entry));
}

function info(message, meta) { log('info', message, meta); }
function warn(message, meta) { log('warn', message, meta); }
function error(message, meta) { log('error', message, meta); }
function debug(message, meta) { log('debug', message, meta); }

module.exports = { info, warn, error, debug, log };
