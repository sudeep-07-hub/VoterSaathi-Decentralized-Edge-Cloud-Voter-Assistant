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

// ─── Regression Tests ────────────────────────────────────────────────────────

describe('Regression tests', () => {

  /**
   * REG-001 — Booth timing queries must return hours, never address-only.
   */
  test('REG-001: all timing phrasings return hours, never address-only', async () => {
    const timingPhrases = [
      'till when is the booth open',
      'what time does polling close',
      'polling hours today',
      'when does the booth close',
    ];
    for (const phrase of timingPhrases) {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: phrase, user_id: 'reg_test_001' });

      expect(res.status).toBe(200);
      expect(res.body.response_text).toMatch(/7:00 AM|7 AM|6:00 PM|6 PM|opening|closing|open from/i);
    }
  });

  /**
   * REG-002 — EPIC masking must never fail under any circumstance.
   */
  test('REG-002: profile agent never exposes unmasked EPIC in response_text', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'what is my voter ID number', user_id: 'reg_test_002' });

    expect(res.status).toBe(200);
    // Full unmasked EPIC (6 consecutive digits after state/year prefix) must not appear
    expect(res.body.response_text).not.toMatch(/[A-Z]{2}\/\d{2}\/\d{6}(?!●)/);
  });

  /**
   * REG-003 — Grievance ticket ID must always be generated and returned.
   */
  test('REG-003: grievance agent always returns a valid ticket_id', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'my name is missing from voter roll', user_id: 'reg_test_003' });

    expect(res.status).toBe(200);
    // ticket_id is nested inside agent_data in orchestrator output
    expect(res.body.agent_data.ticket_id).toMatch(/^GRV-\d{8}-[A-Z0-9]{5}$/);
  });

  /**
   * REG-004 — Accessibility complaints must always fast-path escalate.
   */
  test('REG-004: accessibility grievance is always escalated', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'I am disabled and the booth has no wheelchair ramp, this is wrong', user_id: 'reg_test_004' });

    expect(res.status).toBe(200);
    // Accessibility + frustration words route through GRIEVANCE
    // and get escalated with high urgency
    expect(res.body.agent_data.escalated).toBe(true);
    expect(res.body.agent_data.urgency).toBe('high');
  });

  /**
   * REG-005 — Voter card modal must always trigger from any card-request phrasing.
   */
  test('REG-005: voter card request always triggers open_voter_card_modal', async () => {
    const cardPhrases = [
      'show my voter card',
      'my EPIC card',
      'view my voter ID card',
    ];
    for (const phrase of cardPhrases) {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: phrase, user_id: 'reg_test_005' });

      expect(res.status).toBe(200);
      expect(res.body.ui_action).toBe('open_voter_card_modal');
    }
  });

});

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

describe('Smoke tests — every core query returns 200 with response_text', () => {

  const SMOKE_QUERIES = [
    { message: 'hello',                         label: 'greeting' },
    { message: 'where is my booth',             label: 'booth location' },
    { message: 'till when is the booth open',   label: 'booth timing' },
    { message: 'show my voter card',            label: 'voter card' },
    { message: 'what are my deadlines',         label: 'deadlines' },
    { message: 'I have a complaint',            label: 'grievance' },
    { message: 'how do I update my address',    label: 'form 8' },
    { message: 'am I registered as a voter',    label: 'profile check' },
    { message: 'என் வாக்குச்சாவடி எங்கே',      label: 'Tamil input' },
    { message: 'मेरा मतदान केंद्र कहाँ है',     label: 'Hindi input' },
  ];

  SMOKE_QUERIES.forEach(({ message, label }) => {
    test(`smoke [${label}]: returns 200 with non-empty response_text`, async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message, user_id: 'smoke_test' });

      expect(res.status).toBe(200);
      expect(res.body.response_text).toBeTruthy();
      expect(res.body.response_text.length).toBeGreaterThan(0);
      expect(res.body.agent_used).toBeDefined();
    });
  });

});

