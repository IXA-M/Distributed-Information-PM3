jest.mock('../src/config/database', () => ({ query: jest.fn(), end: jest.fn() }));
jest.mock('../src/kafka/index', () => ({
  connectKafka: jest.fn().mockResolvedValue(),
  disconnectKafka: jest.fn().mockResolvedValue(),
  publishProfileUpdated: jest.fn().mockResolvedValue(),
}));

process.env.JWT_SECRET = 'test_secret';
process.env.PORT = '3098';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../src/config/database');
const app = require('../src/index');

function makeToken(userId) {
  return jwt.sign({ sub: userId }, 'test_secret', { expiresIn: '1h' });
}

const mockProfile = {
  user_id: 1,
  phone: '+201001234567',
  city: 'Cairo',
  bio: 'Test bio',
  updated_at: new Date().toISOString(),
};

describe('GET /health', () => {
  it('returns healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /ready', () => {
  it('returns ready when DB ok', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
  });

  it('returns 503 when DB down', async () => {
    db.query.mockRejectedValueOnce(new Error('down'));
    const res = await request(app).get('/ready');
    expect(res.status).toBe(503);
  });
});

describe('GET /profiles/:id', () => {
  it('returns profile for authenticated owner', async () => {
    db.query.mockResolvedValueOnce({ rows: [mockProfile] });
    const res = await request(app)
      .get('/profiles/1')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user_id).toBe(1);
  });

  it('returns 403 when accessing another user profile', async () => {
    const res = await request(app)
      .get('/profiles/2')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when profile does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/profiles/1')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/profiles/1');
    expect(res.status).toBe(401);
  });
});

describe('PUT /profiles/:id', () => {
  it('updates and returns profile', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...mockProfile, city: 'Alexandria' }] });
    const res = await request(app)
      .put('/profiles/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ city: 'Alexandria' });
    expect(res.status).toBe(200);
    expect(res.body.data.city).toBe('Alexandria');
  });

  it('returns 403 when updating another user profile', async () => {
    const res = await request(app)
      .put('/profiles/2')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ city: 'Cairo' });
    expect(res.status).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).put('/profiles/1').send({ city: 'Cairo' });
    expect(res.status).toBe(401);
  });

  it('returns 422 for invalid phone', async () => {
    const res = await request(app)
      .put('/profiles/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ phone: 'notaphone' });
    expect(res.status).toBe(422);
  });
});
