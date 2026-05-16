jest.mock("../src/services/chaosService", () => ({
  upsertChaosRule: jest.fn(),
  countRules: jest.fn()
}));

jest.mock("../src/config/kafka", () => ({
  getKafkaStatus: jest.fn(() => ({ producerConnected: true })),
  publishChaosRuleActivated: jest.fn(() => Promise.resolve())
}));

const request = require("supertest");
const app = require("../src/app");
const { upsertChaosRule, countRules } = require("../src/services/chaosService");
const { publishChaosRuleActivated } = require("../src/config/kafka");

describe("Chaos Simulator API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /docs/openapi.json returns API documentation", async () => {
    const response = await request(app).get("/docs/openapi.json");

    expect(response.statusCode).toBe(200);
    expect(response.body.info.title).toBe("Chaos Simulator API");
  });

  test("GET /docs redirects to Swagger UI", async () => {
    const response = await request(app).get("/docs");

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/api-docs");
  });

  test("GET /health returns service status", async () => {
    countRules.mockResolvedValue(2);

    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalRules).toBe(2);
  });

  test("GET /ready returns unavailable when database is disconnected", async () => {
    const response = await request(app).get("/ready");

    expect(response.statusCode).toBe(503);
    expect(response.body.success).toBe(false);
  });

  test("GET /metrics returns Prometheus metrics", async () => {
    const response = await request(app).get("/metrics");

    expect(response.statusCode).toBe(200);
    expect(response.text).toContain("http_requests_total");
  });

  test("POST /chaos/latency validates input", async () => {
    const response = await request(app).post("/chaos/latency").send({
      service: "file-registry",
      value: {
        delayMs: -1
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("POST /chaos/error-rate stores rule and publishes event", async () => {
    upsertChaosRule.mockResolvedValue({
      id: "rule-1",
      service: "file-registry",
      type: "error-rate",
      value: { percentage: 25 },
      enabled: true,
      created_at: "2026-04-26T21:00:00.000Z",
      updated_at: "2026-04-26T21:05:00.000Z"
    });

    const response = await request(app).post("/chaos/error-rate").send({
      service: "file-registry",
      value: { percentage: 25 },
      enabled: true
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(publishChaosRuleActivated).toHaveBeenCalledWith({
      id: "rule-1",
      service: "file-registry",
      type: "error-rate",
      value: { percentage: 25 },
      enabled: true,
      updated_at: "2026-04-26T21:05:00.000Z"
    });
  });

  test("POST /chaos/error-rate rejects invalid percentage", async () => {
    const response = await request(app).post("/chaos/error-rate").send({
      service: "file-registry",
      value: { percentage: 101 }
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("unknown route returns standard not found response", async () => {
    const response = await request(app).get("/missing");

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
