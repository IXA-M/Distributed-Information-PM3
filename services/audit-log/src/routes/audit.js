const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { success, error } = require("../response");

const router = express.Router();

// ─────────────────────────────────────────
// POST /audit
// Manually create an audit log entry (REST fallback)
// Primary ingestion is via Kafka consumer
// ─────────────────────────────────────────
router.post("/", (req, res) => {
  const { actor, action, entity, details } = req.body;

  if (!actor || !action || !entity) {
    return error(res, "MISSING_FIELDS", "actor, action, and entity are required", 400);
  }

  const id = uuidv4();

  try {
    db.prepare(`
      INSERT INTO audit_logs (id, actor, action, entity, details, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(id, actor, action, entity, details ? JSON.stringify(details) : null);

    const log = db.prepare("SELECT * FROM audit_logs WHERE id = ?").get(id);
    return success(res, { log }, 201);

  } catch (err) {
    console.error("[POST /audit]", err.message);
    return error(res, "DB_ERROR", "Failed to create audit log entry", 500);
  }
});

// ─────────────────────────────────────────
// GET /audit
// Query audit logs with optional filters
// ─────────────────────────────────────────
router.get("/", (req, res) => {
  const { actor, action, entity, from, to, limit = 50, page = 1 } = req.query;

  const conditions = [];
  const params = [];

  if (actor)  { conditions.push("actor  = ?"); params.push(actor); }
  if (action) { conditions.push("action = ?"); params.push(action); }
  if (entity) { conditions.push("entity = ?"); params.push(entity); }
  if (from)   { conditions.push("created_at >= ?"); params.push(from); }
  if (to)     { conditions.push("created_at <= ?"); params.push(to); }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const pageNum  = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
  const offset   = (pageNum - 1) * pageSize;

  try {
    const total = db.prepare(
      `SELECT COUNT(*) as count FROM audit_logs ${where}`
    ).get(...params).count;

    const logs = db.prepare(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset);

    return success(res, {
      logs,
      pagination: { page: pageNum, limit: pageSize, total }
    });

  } catch (err) {
    console.error("[GET /audit]", err.message);
    return error(res, "DB_ERROR", "Failed to query audit logs", 500);
  }
});

// ─────────────────────────────────────────
// GET /audit/:id
// Get a single audit log entry
// ─────────────────────────────────────────
router.get("/:id", (req, res) => {
  try {
    const log = db.prepare("SELECT * FROM audit_logs WHERE id = ?").get(req.params.id);
    if (!log) return error(res, "NOT_FOUND", "Audit log entry not found", 404);
    return success(res, { log });
  } catch (err) {
    console.error("[GET /audit/:id]", err.message);
    return error(res, "DB_ERROR", "Failed to retrieve audit log", 500);
  }
});

module.exports = router;
