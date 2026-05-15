function createLogger(service) {
  function write(level, message, fields = {}) {
    const record = {
      level,
      service,
      message,
      request_id: fields.request_id || null,
      timestamp: new Date().toISOString(),
      ...fields
    };
    const line = JSON.stringify(record);
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  return {
    debug: (message, fields) => write("debug", message, fields),
    error: (message, fields) => write("error", message, fields),
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields)
  };
}

module.exports = { createLogger };
