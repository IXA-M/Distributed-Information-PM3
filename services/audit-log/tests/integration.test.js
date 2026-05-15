const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

// Use in-memory database for tests
process.env.DB_PATH = ':memory:';

// Mock Kafka – we don't need it for HTTP endpoint tests
jest.mock('kafkajs', () => {
  const mockConsumer = {
    connect: jest.fn().mockResolvedValue(),
    subscribe: jest.fn().mockResolvedValue(),
    run: jest.fn().mockResolvedValue(),
    disconnect: jest.fn().mockResolvedValue(),
  };
  return {
    Kafka: jest.fn().mockImplementation(() => ({
      consumer: jest.fn().mockReturnValue(mockConsumer)
    }))
  };
});

describe('Integration Tests – Audit Log API', () => {
  beforeEach(() => {
    // Clean database before each test
    db.prepare('DELETE FROM audit_logs').run();
  });

  test('POST /audit creates a record and GET /audit returns it', async () => {
    const payload = { actor: 'integration', action: 'test', entity: 'file:1' };
    const postRes = await request(app)
      .post('/audit')
      .send(payload)
      .expect(201);
    expect(postRes.body.success).toBe(true);
    const id = postRes.body.data.log.id;

    const getRes = await request(app).get(/audit/).expect(200);
    expect(getRes.body.data.log.actor).toBe('integration');
    expect(getRes.body.data.log.action).toBe('test');
    expect(getRes.body.data.log.entity).toBe('file:1');
  });

  test('GET /audit supports filtering by actor', async () => {
    await request(app).post('/audit').send({ actor: 'alice', action: 'upload', entity: 'file:a' });
    await request(app).post('/audit').send({ actor: 'bob', action: 'upload', entity: 'file:b' });
    const res = await request(app).get('/audit?actor=alice').expect(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].actor).toBe('alice');
  });

  test('GET /audit pagination works', async () => {
    for (let i = 0; i < 15; i++) {
      await request(app).post('/audit').send({ actor: 'user', action: 'action', entity: ile: });
    }
    const res = await request(app).get('/audit?limit=5&page=2').expect(200);
    expect(res.body.data.logs).toHaveLength(5);
    expect(res.body.data.pagination.page).toBe(2);
    expect(res.body.data.pagination.limit).toBe(5);
    expect(res.body.data.pagination.total).toBe(15);
  });

  test('GET /audit/:id returns 404 for non-existent ID', async () => {
    await request(app).get('/audit/non-existent-id').expect(404);
  });
});
