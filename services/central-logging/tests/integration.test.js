const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

process.env.DB_PATH = ':memory:';

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

describe('Integration Tests – Central Logging API', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM logs').run();
  });

  test('POST /logs creates a log entry and GET /logs returns it', async () => {
    const payload = { service: 'integration', level: 'info', message: 'test log' };
    const postRes = await request(app).post('/logs').send(payload).expect(201);
    const id = postRes.body.data.log.id;

    const getRes = await request(app).get(/logs/).expect(200);
    expect(getRes.body.data.log.service).toBe('integration');
    expect(getRes.body.data.log.message).toBe('test log');
  });

  test('GET /logs filters by service and level', async () => {
    await request(app).post('/logs').send({ service: 'auth', level: 'info', message: 'login' });
    await request(app).post('/logs').send({ service: 'auth', level: 'warn', message: 'failed login' });
    await request(app).post('/logs').send({ service: 'file', level: 'info', message: 'upload' });

    const res = await request(app).get('/logs?service=auth&level=warn').expect(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].message).toBe('failed login');
  });

  test('GET /logs pagination works', async () => {
    for (let i = 0; i < 12; i++) {
      await request(app).post('/logs').send({ service: 'test', message: log  });
    }
    const res = await request(app).get('/logs?limit=5&page=2').expect(200);
    expect(res.body.data.logs).toHaveLength(5);
    expect(res.body.data.pagination.page).toBe(2);
    expect(res.body.data.pagination.total).toBe(12);
  });

  test('GET /logs/:id returns 404 for non-existent ID', async () => {
    await request(app).get('/logs/non-existent-id').expect(404);
  });
});
