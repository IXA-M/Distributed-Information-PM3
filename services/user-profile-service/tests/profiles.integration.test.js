const request = require("supertest");
const app = require("../src/index");
const pool = require("../src/config/database");
const jwt = require("jsonwebtoken");

// Set required env vars for tests
process.env.JWT_SECRET = "test_integration_secret";
process.env.PORT = "3096"; // Use a different port for integration tests
process.env.DB_HOST = "localhost";
process.env.DB_PORT = "5433"; // Use the port for profile-db
process.env.DB_NAME = "profile_db";
process.env.DB_USER = "postgres";
process.env.DB_PASSWORD = "postgres";
process.env.KAFKA_BROKERS = "localhost:29092";

function makeToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

describe("User Profile Service Integration Tests", () => {
  beforeAll(async () => {
    // Ensure the database is clean before running tests
    await pool.query("DELETE FROM profiles");
    const { connectKafka } = require("../src/kafka/index");
    await connectKafka();
  });

  afterAll(async () => {
    const { disconnectKafka } = require("../src/kafka/index");
    await disconnectKafka();
    await pool.end();
  });

  it("should create a user profile", async () => {
    const userId = 100;
    const token = makeToken(userId);
    const res = await request(app)
      .put(`/profiles/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        phone: "+201001234567",
        city: "Cairo",
        bio: "Test bio for integration",
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.user_id).toBe(userId);
    expect(res.body.data.city).toBe("Cairo");

    const profile = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);
    expect(profile.rows.length).toBe(1);
    expect(profile.rows[0].phone).toBe("+201001234567");
  });

  it("should get a user profile", async () => {
    const userId = 100;
    const token = makeToken(userId);
    const res = await request(app)
      .get(`/profiles/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.user_id).toBe(userId);
    expect(res.body.data.city).toBe("Cairo");
  });

  it("should update a user profile", async () => {
    const userId = 100;
    const token = makeToken(userId);
    const res = await request(app)
      .put(`/profiles/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        city: "Alexandria",
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.user_id).toBe(userId);
    expect(res.body.data.city).toBe("Alexandria");

    const profile = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);
    expect(profile.rows.length).toBe(1);
    expect(profile.rows[0].city).toBe("Alexandria");
  });

  it("should not get another user's profile", async () => {
    const userId = 101;
    const token = makeToken(100);
    const res = await request(app)
      .get(`/profiles/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(403);
  });
});
