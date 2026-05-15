const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || "./data/audit_log.db";

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id         TEXT PRIMARY KEY,
    actor      TEXT NOT NULL,
    action     TEXT NOT NULL,
    entity     TEXT NOT NULL,
    details    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_logs(actor);
  CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_logs(action);
  CREATE INDEX IF NOT EXISTS idx_audit_entity   ON audit_logs(entity);
  CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs(created_at);
`);

console.log("[DB] Audit Log database ready at:", DB_PATH);

module.exports = db;
