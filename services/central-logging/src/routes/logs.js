const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { success, error } = require("../response");

const router = express.Router();

// ─────────────────────────────────────────
// POST /logs
// Manually create a log entry (REST fallback)
// Primary ingestion is via Kafka consumer
// ─────────────────────────────────────────
router.post("/", (req, res) => {
  const { service, level, topic, message, payload } = req.body;

  if (!service || !message) {
    return error(res, "MISSING_FIELDS", "service and message are required", 400);
  }

  const allowedLevels = ["debug", "info", "warn", "error"];
  const logLevel = level && allowedLevels.includes(level) ? level : "info";

  const id = uuidv4();

  try {
    db.prepare(`
      INSERT INTO logs (id, service, level, topic, message, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      service,
      logLevel,
      topic || "manual",
      message,
      payload ? JSON.stringify(payload) : null
    );

    const log = db.prepare("SELECT * FROM logs WHERE id = ?").get(id);
    return success(res, { log }, 201);

  } catch (err) {
    console.error("[POST /logs]", err.message);
    return error(res, "DB_ERROR", "Failed to create log entry", 500);
  }
});

// ─────────────────────────────────────────
// GET /logs
// Query logs with optional filters
// ─────────────────────────────────────────
router.get("/", (req, res) => {
  const { service, level, topic, from, to, limit = 50, page = 1 } = req.query;

  const conditions = [];
  const params = [];

  if (service) { conditions.push("service = ?"); params.push(service); }
  if (level)   { conditions.push("level   = ?"); params.push(level); }
  if (topic)   { conditions.push("topic   = ?"); params.push(topic); }
  if (from)    { conditions.push("created_at >= ?"); params.push(from); }
  if (to)      { conditions.push("created_at <= ?"); params.push(to); }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const pageNum  = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
  const offset   = (pageNum - 1) * pageSize;

  try {
    const total = db.prepare(
      `SELECT COUNT(*) as count FROM logs ${where}`
    ).get(...params).count;

    const logs = db.prepare(
      `SELECT * FROM logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset);

    return success(res, {
      logs,
      pagination: { page: pageNum, limit: pageSize, total }
    });

  } catch (err) {
    console.error("[GET /logs]", err.message);
    return error(res, "DB_ERROR", "Failed to query logs", 500);
  }
});

// ─────────────────────────────────────────
// GET /logs/:id
// Get a single log entry
// ─────────────────────────────────────────
router.get("/:id", (req, res) => {
  try {
    const log = db.prepare("SELECT * FROM logs WHERE id = ?").get(req.params.id);
    if (!log) return error(res, "NOT_FOUND", "Log entry not found", 404);
    return success(res, { log });
  } catch (err) {
    console.error("[GET /logs/:id]", err.message);
    return error(res, "DB_ERROR", "Failed to retrieve log", 500);
  }
});

module.exports = router;
