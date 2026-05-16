const request = require("supertest");
const app = require("../src/index");
const pool = require("../src/config/database");
const bcrypt = require("bcryptjs");

// Set required env vars for tests
process.env.JWT_SECRET = "test_integration_secret";
process.env.PORT = "3097"; // Use a different port for integration tests
process.env.DB_HOST = "localhost";
process.env.DB_PORT = "5432";
process.env.DB_NAME = "auth_db";
process.env.DB_USER = "postgres";
process.env.DB_PASSWORD = "postgres";

describe("Auth Service Integration Tests", () => {
  beforeAll(async () => {
    // Ensure the database is clean before running tests
    await pool.query("DELETE FROM refresh_tokens");
    await pool.query("DELETE FROM users");
    const { connectKafka } = require("../src/kafka/producer");
    await connectKafka();
  });

  afterAll(async () => {
    const { disconnectKafka } = require("../src/kafka/producer");
    await disconnectKafka();
    await pool.end();
  });

  it("should register a new user", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "Integration User",
      email: "integration@example.com",
      password: "Password123",
    });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data).toHaveProperty("refresh_token");

    const user = await pool.query("SELECT * FROM users WHERE email = $1", ["integration@example.com"]);
    expect(user.rows.length).toBe(1);
    expect(user.rows[0].name).toBe("Integration User");
  });

  it("should not register a user with an existing email", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "Another User",
      email: "integration@example.com",
      password: "Password123",
    });

    expect(res.statusCode).toEqual(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("should log in an existing user", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "integration@example.com",
      password: "Password123",
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data).toHaveProperty("refresh_token");
  });

  it("should not log in with incorrect password", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "integration@example.com",
      password: "WrongPassword",
    });

    expect(res.statusCode).toEqual(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("should refresh token", async () => {
    const loginRes = await request(app).post("/auth/login").send({
      email: "integration@example.com",
      password: "Password123",
    });
    const refreshToken = loginRes.body.data.refresh_token;

    const refreshRes = await request(app).post("/auth/refresh").send({
      refresh_token: refreshToken,
    });

    expect(refreshRes.statusCode).toEqual(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data).toHaveProperty("token");
    expect(refreshRes.body.data).toHaveProperty("refresh_token");
  });
});
