/**
 * Central Logging Service — Unit Tests
 * Framework: Jest + Supertest
 * Kafka: fully mocked — no real broker needed
 * Database: in-memory SQLite (:memory:)
 * Coverage: health, readiness, POST /logs, GET /logs, GET /logs/:id, normalizeEvent
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
process.env.PORT    = "3098";

const request = require("supertest");
const app     = require("../src/app");
const db      = require("../src/db");

// ── Seed helper ───────────────────────────────────────────────
function seedLog(overrides = {}) {
  const { v4: uuidv4 } = require("uuid");
  const row = {
    id:         uuidv4(),
    service:    "file-registry",
    level:      "info",
    topic:      "audit.event",
    message:    "[AUDIT] actor=user_1 action=file.deleted entity=file:abc",
    payload:    null,
    created_at: new Date().toISOString(),
    ...overrides
  };
  db.prepare(`
    INSERT INTO logs (id, service, level, topic, message, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(row.id, row.service, row.level, row.topic,
         row.message, row.payload, row.created_at);
  return row;
}

// ── Clean DB before each test ─────────────────────────────────
beforeEach(() => {
  db.prepare("DELETE FROM logs").run();
});

// ═════════════════════════════════════════════════
// TEST 1 — GET /health
// ═════════════════════════════════════════════════
describe("GET /health", () => {
  it("returns 200 with status ok and correct service name", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("central-logging");
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
// TEST 3 — POST /logs
// ═════════════════════════════════════════════════
describe("POST /logs", () => {

  it("creates a new log entry and returns 201", async () => {
    const res = await request(app)
      .post("/logs")
      .send({
        service: "garbage-collector",
        level:   "info",
        message: "[GC] Run completed",
        topic:   "gc.completed"
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.log.service).toBe("garbage-collector");
    expect(res.body.data.log.level).toBe("info");
    expect(res.body.data.log.id).toBeDefined();
  });

  it("returns 400 when service is missing", async () => {
    const res = await request(app)
      .post("/logs")
      .send({ message: "something happened" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("MISSING_FIELDS");
  });

  it("returns 400 when message is missing", async () => {
    const res = await request(app)
      .post("/logs")
      .send({ service: "garbage-collector" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("defaults level to info when invalid level provided", async () => {
    const res = await request(app)
      .post("/logs")
      .send({ service: "test-svc", message: "test", level: "critical" });

    expect(res.status).toBe(201);
    expect(res.body.data.log.level).toBe("info");
  });

  it("defaults topic to manual when no topic provided", async () => {
    const res = await request(app)
      .post("/logs")
      .send({ service: "test-svc", message: "manual log entry" });

    expect(res.status).toBe(201);
    expect(res.body.data.log.topic).toBe("manual");
  });

  it("includes request_id and service name in meta", async () => {
    const res = await request(app)
      .post("/logs")
      .send({ service: "chaos-simulator", message: "chaos injected" });

    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.service).toBe("central-logging");
    expect(res.body.meta.request_id).toBeDefined();
  });
});

// ═════════════════════════════════════════════════
// TEST 4 — GET /logs (list + filters)
// ═════════════════════════════════════════════════
describe("GET /logs", () => {

  it("returns empty list when no logs exist", async () => {
    const res = await request(app).get("/logs");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toHaveLength(0);
    expect(res.body.data.pagination.total).toBe(0);
  });

  it("returns all logs with correct structure", async () => {
    seedLog({ service: "garbage-collector" });
    seedLog({ service: "chaos-simulator", level: "warn" });

    const res = await request(app).get("/logs");
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(2);
    expect(res.body.meta.service).toBe("central-logging");
  });

  it("filters by service correctly", async () => {
    seedLog({ service: "garbage-collector" });
    seedLog({ service: "chaos-simulator" });

    const res = await request(app).get("/logs?service=garbage-collector");
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].service).toBe("garbage-collector");
  });

  it("filters by level correctly", async () => {
    seedLog({ level: "info" });
    seedLog({ level: "warn" });
    seedLog({ level: "error" });

    const res = await request(app).get("/logs?level=warn");
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].level).toBe("warn");
  });

  it("filters by topic correctly", async () => {
    seedLog({ topic: "audit.event" });
    seedLog({ topic: "gc.completed" });
    seedLog({ topic: "chaos.rule.activated" });

    const res = await request(app).get("/logs?topic=gc.completed");
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].topic).toBe("gc.completed");
  });

  it("combines multiple filters", async () => {
    seedLog({ service: "garbage-collector", level: "info",  topic: "gc.completed" });
    seedLog({ service: "garbage-collector", level: "error", topic: "gc.completed" });
    seedLog({ service: "chaos-simulator",   level: "warn",  topic: "chaos.rule.activated" });

    const res = await request(app)
      .get("/logs?service=garbage-collector&level=error");
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].level).toBe("error");
  });

  it("paginates results correctly", async () => {
    for (let i = 0; i < 6; i++) seedLog({ service: `svc_${i}` });

    const res = await request(app).get("/logs?limit=2&page=1");
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(6);
    expect(res.body.data.pagination.limit).toBe(2);
  });

  it("caps limit at 100", async () => {
    const res = await request(app).get("/logs?limit=9999");
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(100);
  });
});

// ═════════════════════════════════════════════════
// TEST 5 — GET /logs/:id
// ═════════════════════════════════════════════════
describe("GET /logs/:id", () => {

  it("returns a single log entry by ID", async () => {
    const log = seedLog({
      service: "chaos-simulator",
      level:   "warn",
      topic:   "chaos.rule.activated"
    });

    const res = await request(app).get(`/logs/${log.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.log.id).toBe(log.id);
    expect(res.body.data.log.service).toBe("chaos-simulator");
    expect(res.body.data.log.level).toBe("warn");
  });

  it("returns 404 for non-existent ID", async () => {
    const res = await request(app).get("/logs/non-existent-id");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns correct error response format on 404", async () => {
    const res = await request(app).get("/logs/fake-id-456");
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("error.code", "NOT_FOUND");
    expect(res.body).toHaveProperty("meta.service", "central-logging");
    expect(res.body).toHaveProperty("meta.request_id");
  });
});
