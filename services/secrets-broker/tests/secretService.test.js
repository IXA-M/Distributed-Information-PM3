jest.mock("../src/models/IssuedSecret", () => ({
  create: jest.fn(),
  countDocuments: jest.fn()
}));

const IssuedSecret = require("../src/models/IssuedSecret");
const { countActiveSecrets, issueSecret } = require("../src/services/secretService");

describe("secretService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("issueSecret stores a hashed secret and returns the raw secret once", async () => {
    const expiresAt = new Date("2026-05-16T12:00:00.000Z");
    const issuedAt = new Date("2026-05-16T11:00:00.000Z");
    IssuedSecret.create.mockResolvedValue({
      _id: "secret-id",
      service: "chaos-simulator",
      expires_at: expiresAt,
      issued_at: issuedAt,
      scopes: ["chaos:write"]
    });

    const result = await issueSecret({
      service: "chaos-simulator",
      expiresInSeconds: 3600,
      scopes: ["chaos:write"]
    });

    expect(IssuedSecret.create).toHaveBeenCalledWith(expect.objectContaining({
      service: "chaos-simulator",
      secret_hash: expect.any(String),
      scopes: ["chaos:write"]
    }));
    expect(result.secret).toHaveLength(64);
    expect(result.secret).not.toBe(IssuedSecret.create.mock.calls[0][0].secret_hash);
  });

  test("issueSecret defaults expiry and scopes", async () => {
    IssuedSecret.create.mockResolvedValue({
      _id: "secret-id",
      service: "storage-gateway",
      expires_at: new Date(),
      issued_at: new Date(),
      scopes: []
    });

    const result = await issueSecret({ service: "storage-gateway" });

    expect(IssuedSecret.create.mock.calls[0][0].scopes).toEqual([]);
    expect(result.scopes).toEqual([]);
  });

  test("countActiveSecrets only counts non-expired secrets", async () => {
    IssuedSecret.countDocuments.mockResolvedValue(2);

    const result = await countActiveSecrets();

    expect(result).toBe(2);
    expect(IssuedSecret.countDocuments).toHaveBeenCalledWith({
      expires_at: { $gt: expect.any(Date) }
    });
  });
});
