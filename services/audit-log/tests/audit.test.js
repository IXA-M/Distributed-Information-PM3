/**
 * Audit Log Service — Unit Tests
 * Framework: Jest + Supertest
 * Kafka: fully mocked (no real broker needed)
 * Database: in-memory SQLite (:memory:)
 * Coverage: health, readiness, POST /audit, GET /audit, GET /audit/:id
 */

// ── Mock Kafka completely ─────────────────────────────────────
jest.mock("kafkajs", () => {
  const mockConsumer = {
    connect:    jest.fn().mockResolvedValue(),
    subscribe:  jest.fn().mockResolvedValue(),
    run:        jest.fn().mockResolvedValue(),
    disconnect: jest.fn().mockResolvedValue(),
  };
  return {
    Kafka: jest.fn().mockImplementation(() => ({
      consumer: jest.fn().mockReturnValue(mockConsumer),
    })),
  };
});

// ── Use in-memory SQLite for tests ────────────────────────────
process.env.DB_PATH = ":memory:";
process.env.PORT    = "3099";

const request = require("supertest");
const app     = require("../src/app");
const db      = require("../src/db");

// ── Seed helper ───────────────────────────────────────────────
function seedLog(overrides = {}) {
  const { v4: uuidv4 } = require("uuid");
  const row = {
    id:         uuidv4(),
    actor:      "user_1",
    action:     "file.deleted",
    entity:     "file:abc123",
    details:    null,
    created_at: new Date().toISOString(),
    ...overrides
  };
  db.prepare(`
    INSERT INTO audit_logs (id, actor, action, entity, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(row.id, row.actor, row.action, row.entity, row.details, row.created_at);
  return row;
}

// ── Clean DB before each test ─────────────────────────────────
beforeEach(() => {
  db.prepare("DELETE FROM audit_logs").run();
});

// ═════════════════════════════════════════════════
// TEST 1 — GET /health
// ═════════════════════════════════════════════════
describe("GET /health", () => {
  it("returns 200 with status ok and service name", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("audit-log");
  });
});

// ═════════════════════════════════════════════════
// TEST 2 — GET /ready
// ═════════════════════════════════════════════════
describe("GET /ready", () => {
  it("returns 200 with status ready", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
  });
});

// ═════════════════════════════════════════════════
// TEST 3 — POST /audit
// ═════════════════════════════════════════════════
describe("POST /audit", () => {

  it("creates a new audit log entry and returns 201", async () => {
    const res = await request(app)
      .post("/audit")
      .send({ actor: "user_1", action: "file.deleted", entity: "file:abc" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.log.actor).toBe("user_1");
    expect(res.body.data.log.action).toBe("file.deleted");
    expect(res.body.data.log.entity).toBe("file:abc");
    expect(res.body.data.log.id).toBeDefined();
  });

  it("returns 400 when actor is missing", async () => {
    const res = await request(app)
      .post("/audit")
      .send({ action: "file.deleted", entity: "file:abc" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("MISSING_FIELDS");
  });

  it("returns 400 when action is missing", async () => {
    const res = await request(app)
      .post("/audit")
      .send({ actor: "user_1", entity: "file:abc" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when entity is missing", async () => {
    const res = await request(app)
      .post("/audit")
      .send({ actor: "user_1", action: "file.deleted" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when body is empty", async () => {
    const res = await request(app)
      .post("/audit")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("includes request_id and service in meta", async () => {
    const res = await request(app)
      .post("/audit")
      .send({ actor: "user_1", action: "login", entity: "user:1" });

    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.service).toBe("audit-log");
    expect(res.body.meta.request_id).toBeDefined();
  });
});

// ═════════════════════════════════════════════════
// TEST 4 — GET /audit (list + filters)
// ═════════════════════════════════════════════════
describe("GET /audit", () => {

  it("returns empty list when no logs exist", async () => {
    const res = await request(app).get("/audit");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toHaveLength(0);
    expect(res.body.data.pagination.total).toBe(0);
  });

  it("returns all logs with correct structure", async () => {
    seedLog({ actor: "user_1" });
    seedLog({ actor: "user_2" });

    const res = await request(app).get("/audit");
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(2);
  });

  it("filters by actor correctly", async () => {
    seedLog({ actor: "user_1" });
    seedLog({ actor: "user_2" });

    const res = await request(app).get("/audit?actor=user_1");
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].actor).toBe("user_1");
  });

  it("filters by action correctly", async () => {
    seedLog({ action: "file.deleted" });
    seedLog({ action: "file.uploaded" });

    const res = await request(app).get("/audit?action=file.deleted");
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].action).toBe("file.deleted");
  });

  it("filters by entity correctly", async () => {
    seedLog({ entity: "file:abc" });
    seedLog({ entity: "file:xyz" });

    const res = await request(app).get("/audit?entity=file:abc");
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].entity).toBe("file:abc");
  });

  it("paginates results correctly", async () => {
    for (let i = 0; i < 5; i++) seedLog({ actor: `user_${i}` });

    const res = await request(app).get("/audit?limit=2&page=1");
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(5);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(2);
  });

  it("caps limit at 100", async () => {
    const res = await request(app).get("/audit?limit=9999");
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(100);
  });
});

// ═════════════════════════════════════════════════
// TEST 5 — GET /audit/:id
// ═════════════════════════════════════════════════
describe("GET /audit/:id", () => {

  it("returns a single log entry by ID", async () => {
    const log = seedLog({ actor: "user_99", action: "login" });

    const res = await request(app).get(`/audit/${log.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.log.id).toBe(log.id);
    expect(res.body.data.log.actor).toBe("user_99");
  });

  it("returns 404 for non-existent ID", async () => {
    const res = await request(app).get("/audit/non-existent-id");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns correct response format on 404", async () => {
    const res = await request(app).get("/audit/fake-id-123");
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("error.code");
    expect(res.body).toHaveProperty("meta.service", "audit-log");
    expect(res.body).toHaveProperty("meta.request_id");
  });
});
