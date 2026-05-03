// tests/agents/fallbackAgent.test.js
const { handleFallback } = require('../../server/agents/fallbackAgent');

describe('Fallback Agent', () => {

  test('returns exactly 3 suggested actions', async () => {
    const result = await handleFallback({ message: 'sdfgh gibberish' });
    expect(result.suggested_actions).toHaveLength(3);
  });

  test('response_text is never empty', async () => {
    const result = await handleFallback({ message: '' });
    expect(result.response_text.length).toBeGreaterThan(0);
  });

  test('proactive_trigger is true when idle flag passed', async () => {
    const result = await handleFallback({ message: '', idle: true });
    expect(result.proactive_trigger).toBe(true);
  });

  test('never returns "I don\'t know" without a next step', async () => {
    const result = await handleFallback({ message: 'asdfg' });
    if (result.response_text.toLowerCase().includes("don't know")) {
      expect(result.suggested_actions.length).toBeGreaterThan(0);
    }
  });

});
