jest.mock("../src/models/ChaosRule", () => ({
  countDocuments: jest.fn(),
  findOneAndUpdate: jest.fn()
}));

const ChaosRule = require("../src/models/ChaosRule");
const { countRules, upsertChaosRule } = require("../src/services/chaosService");

describe("chaosService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("upsertChaosRule stores service, type, value, and enabled flag", async () => {
    ChaosRule.findOneAndUpdate.mockResolvedValue({
      _id: "rule-id",
      service: "file-registry",
      type: "latency",
      value: { delayMs: 250 },
      enabled: true,
      created_at: new Date("2026-05-16T10:00:00.000Z"),
      updated_at: new Date("2026-05-16T10:01:00.000Z")
    });

    const result = await upsertChaosRule({
      service: "file-registry",
      type: "latency",
      value: { delayMs: 250 },
      enabled: true
    });

    expect(ChaosRule.findOneAndUpdate).toHaveBeenCalledWith(
      { service: "file-registry", type: "latency" },
      expect.objectContaining({
        service: "file-registry",
        type: "latency",
        value: { delayMs: 250 },
        enabled: true,
        updated_at: expect.any(Date)
      }),
      expect.objectContaining({ new: true, upsert: true })
    );
    expect(result.id).toBe("rule-id");
  });

  test("upsertChaosRule defaults enabled to true unless explicitly false", async () => {
    ChaosRule.findOneAndUpdate.mockResolvedValue({
      _id: "rule-id",
      service: "storage-gateway",
      type: "error-rate",
      value: { percentage: 10 },
      enabled: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    await upsertChaosRule({
      service: "storage-gateway",
      type: "error-rate",
      value: { percentage: 10 }
    });

    expect(ChaosRule.findOneAndUpdate.mock.calls[0][1].enabled).toBe(true);
  });

  test("countRules returns total configured chaos rules", async () => {
    ChaosRule.countDocuments.mockResolvedValue(4);

    await expect(countRules()).resolves.toBe(4);
  });
});
