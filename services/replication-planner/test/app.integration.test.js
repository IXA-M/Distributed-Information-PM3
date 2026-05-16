const request = require("supertest");
const { createReplicationPlannerApp } = require("../src/app");
jest.mock("../../../../shared/authenticate", () => (req, res, next) => {
  req.userId = "test-user";
  next();
});

describe("replication-planner HTTP integration tests", () => {
  let database;
  let app;

  beforeEach(() => {
    database = createTestDatabase();
    database.seed([{ id: "seed-plan", status: "planned" }]);
    app = createReplicationPlannerApp({
      logger: silentLogger(),
      planner: database.planner,
      readyCheck: async () => ({ database: "mongodb", kafka_producer: "ok" }),
      serviceName: "replication-planner"
    });
  });

  afterEach(() => {
    database.clean();
  });

  test("GET /health returns ok", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ok");
  });

  test("GET /ready returns dependency checks", async () => {
    const response = await request(app).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body.data.checks.database).toBe("mongodb");
  });

  test("POST /replication/plan creates a plan", async () => {
    const response = await request(app)
      .post("/replication/plan")
      .send({
        event_type: "upload.completed",
        data: { chunks: [{ chunk_id: "chunk-a" }] }
      });

    expect(response.status).toBe(202);
    expect(response.body.data.plan_id).toBe("plan-test");
    expect(response.body.data.task_count).toBe(1);
  });

  test("GET /metrics exposes Prometheus text", async () => {
    await request(app).get("/health");
    const response = await request(app).get("/metrics");

    expect(response.status).toBe(200);
    expect(response.text).toMatch(/service_http_requests_total/);
  });

  test("GET /docs serves OpenAPI content", async () => {
    const response = await request(app).get("/docs");

    expect(response.status).toBe(200);
    expect(response.text).toMatch(/Replication Planner API/);
  });
});

function createTestDatabase() {
  const plans = new Map();
  return {
    seed(rows) {
      plans.clear();
      for (const row of rows) {
        plans.set(row.id, row);
      }
    },
    clean() {
      plans.clear();
    },
    planner: {
      async planFromEvent(sourceTopic) {
        const plan = {
          id: "plan-test",
          source_event_id: "event-test",
          source_topic: sourceTopic,
          task_count: 1,
          tasks: [{ chunk_id: "chunk-a", status: "planned" }]
        };
        plans.set(plan.id, plan);
        return {
          plan_id: plan.id,
          source_event_id: plan.source_event_id,
          source_topic: plan.source_topic,
          task_count: plan.task_count,
          tasks: plan.tasks
        };
      }
    }
  };
}

function silentLogger() {
  return { debug() {}, error() {}, info() {}, warn() {} };
}
