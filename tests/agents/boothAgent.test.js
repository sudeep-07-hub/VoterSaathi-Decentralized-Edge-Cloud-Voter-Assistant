// tests/agents/boothAgent.test.js
const { handleBooth } = require('../../server/agents/boothAgent');

describe('Booth Agent — sub-intent routing', () => {

  // ── TIMING sub-intent ─────────────────────────────────────────────────────

  test('TIMING: returns opening hours when asked "till when is booth open"', async () => {
    const result = await handleBooth({
      message: 'till when is the polling booth open',
      sub_intent: 'TIMING',
      booth_id: 'TN_KRI_42'
    });
    expect(result.election_day_timing).toBeDefined();
    expect(result.election_day_timing.opens).toBe('7:00 AM');
    expect(result.election_day_timing.closes).toBe('6:00 PM');
    expect(result.election_day_timing.queue_rule).toBeTruthy();
    expect(result.response_text).toContain('7:00 AM');
    // Critical: address must NOT appear in a timing-only response
    expect(result.response_text).not.toContain('Station Road');
  });

  test('TIMING: returns what to carry on election day', async () => {
    const result = await handleBooth({
      message: 'what time does voting end',
      sub_intent: 'TIMING',
      booth_id: 'TN_KRI_42'
    });
    expect(result.election_day_timing.carry).toBeTruthy();
    expect(result.response_text.toLowerCase()).toMatch(/epic|voter slip/);
  });

  test('TIMING: offline_safe is true', async () => {
    const result = await handleBooth({ sub_intent: 'TIMING', booth_id: 'TN_KRI_42' });
    expect(result.offline_safe).toBe(true);
  });

  // ── LOCATION sub-intent ───────────────────────────────────────────────────

  test('LOCATION: returns address and maps link for "where is my booth"', async () => {
    const result = await handleBooth({
      message: 'where is my polling booth',
      sub_intent: 'LOCATION',
      booth_id: 'TN_KRI_42'
    });
    expect(result.booth_address).toBeDefined();
    expect(result.maps_directions_link).toBeDefined();
    expect(result.distance_km).toBeGreaterThan(0);
    // Critical: timing must NOT appear in a location-only response
    expect(result.response_text).not.toContain('7:00 AM');
  });

  test('LOCATION: maps_directions_link is a valid URL', async () => {
    const result = await handleBooth({ sub_intent: 'LOCATION', booth_id: 'TN_KRI_42' });
    expect(result.maps_directions_link).toMatch(/^https:\/\/maps\.google\.com/);
  });

  // ── FULL sub-intent ───────────────────────────────────────────────────────

  test('FULL: returns address, timing, and BLO for generic booth query', async () => {
    const result = await handleBooth({
      message: 'tell me about my booth',
      sub_intent: 'FULL',
      booth_id: 'TN_KRI_42'
    });
    expect(result.booth_address).toBeDefined();
    expect(result.election_day_timing).toBeDefined();
    expect(result.blo_name).toBeDefined();
    expect(result.blo_phone).toBeDefined();
  });

  // ── ACCESSIBILITY sub-intent ──────────────────────────────────────────────

  test('ACCESSIBILITY: escalates inaccessible booth with HIGH urgency', async () => {
    const result = await handleBooth({
      message: 'is my booth wheelchair accessible',
      sub_intent: 'ACCESSIBILITY',
      booth_id: 'TN_KRI_INACCESSIBLE_TEST'
    });
    expect(result.urgency).toBe('high');
    expect(result.escalated).toBe(true);
    expect(result.response_text).toMatch(/escalat|flagged|priority/i);
  });

  test('ACCESSIBILITY: returns accessible status for accessible booth', async () => {
    const result = await handleBooth({
      sub_intent: 'ACCESSIBILITY',
      booth_id: 'TN_KRI_42'
    });
    expect(result.accessibility.wheelchair_ramp).toBeDefined();
    expect(result.urgency).toBe('low');
    expect(result.escalated).toBe(false);
  });

  // ── Booth change detection ────────────────────────────────────────────────

  test('booth_changed is true when booth ID differs from cache', async () => {
    const result = await handleBooth({
      sub_intent: 'LOCATION',
      booth_id: 'TN_KRI_42',
      cached_booth_id: 'TN_KRI_OLD'
    });
    expect(result.booth_changed).toBe(true);
  });

  test('booth_changed is false when booth ID matches cache', async () => {
    const result = await handleBooth({
      sub_intent: 'LOCATION',
      booth_id: 'TN_KRI_42',
      cached_booth_id: 'TN_KRI_42'
    });
    expect(result.booth_changed).toBe(false);
  });

});
