// tests/integration/chat.test.js
const request = require('supertest');
const app     = require('../../server/index');

describe('POST /api/chat — end-to-end orchestrator', () => {

  test('routes booth timing → Booth Agent, response has timing info', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'till when is the booth open', user_id: 'test_001' });

    expect(res.status).toBe(200);
    expect(res.body.agent_used).toBe('BOOTH');
    expect(res.body.response_text).toMatch(/7:00 AM|7 AM|opening/i);
    expect(res.body.urgency).toMatch(/low|medium|high/);
    expect(typeof res.body.offline_safe).toBe('boolean');
  });

  test('routes deadline query → Deadline Agent', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'what are my upcoming deadlines', user_id: 'test_001' });

    expect(res.status).toBe(200);
    expect(res.body.agent_used).toBe('DEADLINE');
  });

  test('routes voter card request → Profile Agent with modal action', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'show my voter card', user_id: 'test_001' });

    expect(res.status).toBe(200);
    expect(res.body.agent_used).toBe('PROFILE');
    expect(res.body.ui_action).toBe('open_voter_card_modal');
  });

  test('returns 400 for empty message', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: '', user_id: 'test_001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  test('returns 400 for missing user_id', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'hello' });

    expect(res.status).toBe(400);
  });

  test('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('response time is under 2000ms', async () => {
    const start = Date.now();
    await request(app)
      .post('/api/chat')
      .send({ message: 'where is my booth', user_id: 'test_001' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  test('all response fields present for any valid query', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'hello', user_id: 'test_001' });

    expect(res.body.agent_used).toBeDefined();
    expect(res.body.response_text).toBeDefined();
    expect(res.body.ui_action).toBeDefined();
    expect(res.body.urgency).toBeDefined();
    expect(typeof res.body.offline_safe).toBe('boolean');
  });

});
