// tests/auth.test.js
// Unit tests – mock DB and Kafka so no real connections needed

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  end: jest.fn(),
}));

jest.mock('../src/kafka/producer', () => ({
  connectKafka: jest.fn().mockResolvedValue(),
  disconnectKafka: jest.fn().mockResolvedValue(),
  publishUserRegistered: jest.fn().mockResolvedValue(),
}));

const request = require('supertest');
const db = require('../src/config/database');

// Set required env vars before requiring the app
process.env.JWT_SECRET = 'test_secret';
process.env.PORT = '3099';

const app = require('../src/index');

// Helpers
function mockUserRow(overrides = {}) {
  const bcrypt = require('bcryptjs');
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password_hash: bcrypt.hashSync('Password1', 12),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('GET /health', () => {
  it('returns healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /ready', () => {
  it('returns ready when DB ok', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
  });

  it('returns 503 when DB down', async () => {
    db.query.mockRejectedValueOnce(new Error('connection refused'));
    const res = await request(app).get('/ready');
    expect(res.status).toBe(503);
  });
});

describe('POST /auth/register', () => {
  it('registers a new user and returns tokens', async () => {
    // findByEmail returns null (no existing user)
    db.query
      .mockResolvedValueOnce({ rows: [] })          // findByEmail
      .mockResolvedValueOnce({ rows: [mockUserRow()] }) // INSERT user
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // INSERT refresh_token

    const res = await request(app).post('/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password1',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('refresh_token');
  });

  it('returns 409 when email already taken', async () => {
    db.query.mockResolvedValueOnce({ rows: [mockUserRow()] }); // findByEmail

    const res = await request(app).post('/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password1',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('returns 422 for invalid body', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'bad' });
    expect(res.status).toBe(422);
  });
});

describe('POST /auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [mockUserRow()] })  // findByEmail
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });     // INSERT refresh_token

    const res = await request(app).post('/auth/login').send({
      email: 'test@example.com',
      password: 'Password1',
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
  });

  it('returns 401 for wrong password', async () => {
    db.query.mockResolvedValueOnce({ rows: [mockUserRow()] });

    const res = await request(app).post('/auth/login').send({
      email: 'test@example.com',
      password: 'WrongPass9',
    });

    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // user not found

    const res = await request(app).post('/auth/login').send({
      email: 'nobody@example.com',
      password: 'Password1',
    });

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('returns new tokens for valid refresh_token', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, expires_at: new Date(Date.now() + 86400000) }] }) // findByToken
      .mockResolvedValueOnce({ rows: [] })             // deleteByToken
      .mockResolvedValueOnce({ rows: [{ id: 2 }] });  // INSERT new refresh_token

    const res = await request(app).post('/auth/refresh').send({ refresh_token: 'somevalidtoken' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
  });

  it('returns 400 when refresh_token missing', async () => {
    const res = await request(app).post('/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for expired/invalid token', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // not found
    const res = await request(app).post('/auth/refresh').send({ refresh_token: 'badtoken' });
    expect(res.status).toBe(401);
  });
});
