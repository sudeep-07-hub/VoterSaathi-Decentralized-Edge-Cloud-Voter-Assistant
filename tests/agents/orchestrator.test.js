// tests/agents/orchestrator.test.js
const { route } = require('../../server/agents/orchestrator');

const mockProfile = {
  name: 'Arjun Mehta',
  epic_masked: 'TN/24/004●●●',
  constituency: 'Hosur AC',
  booth_id: 'TN_KRI_42',
  completion_pct: 75,
  language_pref: 'en'
};

describe('Orchestrator — intent routing', () => {

  test('routes booth timing query → BOOTH domain', async () => {
    const result = await route({
      message: 'till when is the booth open',
      user_profile: mockProfile
    });
    expect(result.agent_used).toBe('BOOTH');
  });

  test('routes voter ID query → PROFILE domain', async () => {
    const result = await route({
      message: 'what is my EPIC number',
      user_profile: mockProfile
    });
    expect(result.agent_used).toBe('PROFILE');
  });

  test('routes form query → APPLICATION domain', async () => {
    const result = await route({
      message: 'how do I submit Form 8',
      user_profile: mockProfile
    });
    expect(result.agent_used).toBe('APPLICATION');
  });

  test('routes deadline query → DEADLINE domain', async () => {
    const result = await route({
      message: 'what are my upcoming deadlines',
      user_profile: mockProfile
    });
    expect(result.agent_used).toBe('DEADLINE');
  });

  test('routes complaint → GRIEVANCE domain', async () => {
    const result = await route({
      message: 'my name is missing from the voter roll, this is wrong',
      user_profile: mockProfile
    });
    expect(result.agent_used).toBe('GRIEVANCE');
  });

  test('routes unknown query → FALLBACK domain', async () => {
    const result = await route({
      message: 'sdfghjkl random gibberish',
      user_profile: mockProfile
    });
    expect(result.agent_used).toBe('FALLBACK');
  });

  test('always returns required output fields', async () => {
    const result = await route({
      message: 'hello',
      user_profile: mockProfile
    });
    expect(result.agent_used).toBeDefined();
    expect(result.response_text).toBeDefined();
    expect(result.ui_action).toBeDefined();
    expect(result.urgency).toMatch(/low|medium|high/);
    expect(typeof result.offline_safe).toBe('boolean');
  });

  test('addresses user by first name in response', async () => {
    const result = await route({
      message: 'where is my booth',
      user_profile: mockProfile
    });
    expect(result.response_text).toContain('Arjun');
  });

  describe('Dashboard Data', () => {
    const { getDashboardData } = require('../../server/agents/orchestrator');
    
    test('returns dashboard data for user', () => {
      const data = getDashboardData('USR-TN-001', mockProfile);
      expect(data.profile).toBeDefined();
      expect(data.deadlines).toBeDefined();
      expect(data.proactive_alerts).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.name).toBeDefined();
    });
  });

});
