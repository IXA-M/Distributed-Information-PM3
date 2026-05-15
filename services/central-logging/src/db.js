const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || "./data/central_logging.db";

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id         TEXT PRIMARY KEY,
    service    TEXT NOT NULL,
    level      TEXT NOT NULL DEFAULT 'info'
                CHECK(level IN ('debug', 'info', 'warn', 'error')),
    topic      TEXT NOT NULL,
    message    TEXT NOT NULL,
    payload    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_logs_service   ON logs(service);
  CREATE INDEX IF NOT EXISTS idx_logs_level     ON logs(level);
  CREATE INDEX IF NOT EXISTS idx_logs_topic     ON logs(topic);
  CREATE INDEX IF NOT EXISTS idx_logs_created   ON logs(created_at);
`);

console.log("[DB] Central Logging database ready at:", DB_PATH);

module.exports = db;
