// tests/agents/deadlineAgent.test.js
const { getDaysRemaining, classifyUrgency,
        getUpcomingDeadlines, isWindowClosed } = require('../../server/agents/deadlineAgent');

describe('Deadline Agent', () => {

  describe('Days remaining calculation', () => {
    test('returns correct days for future date', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      expect(getDaysRemaining(future.toISOString().split('T')[0])).toBe(5);
    });

    test('returns 0 for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(getDaysRemaining(today)).toBe(0);
    });

    test('returns negative for past date', () => {
      expect(getDaysRemaining('2020-01-01')).toBeLessThan(0);
    });
  });

  describe('Urgency classification', () => {
    test('classifies high urgency for ≤ 3 days', () => {
      expect(classifyUrgency(3)).toBe('high');
      expect(classifyUrgency(1)).toBe('high');
      expect(classifyUrgency(0)).toBe('high');
    });

    test('classifies medium urgency for 4–7 days', () => {
      expect(classifyUrgency(7)).toBe('medium');
      expect(classifyUrgency(4)).toBe('medium');
    });

    test('classifies low urgency for > 7 days', () => {
      expect(classifyUrgency(8)).toBe('low');
      expect(classifyUrgency(30)).toBe('low');
    });
  });

  describe('Closed window detection', () => {
    test('detects closed window for past deadline', () => {
      expect(isWindowClosed('2020-01-01')).toBe(true);
    });

    test('window is open for future deadline', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      expect(isWindowClosed(future.toISOString().split('T')[0])).toBe(false);
    });
  });

  describe('Upcoming deadlines', () => {
    test('returns deadlines sorted by days_left ascending', () => {
      const deadlines = getUpcomingDeadlines();
      for (let i = 0; i < deadlines.length - 1; i++) {
        expect(deadlines[i].days_left).toBeLessThanOrEqual(deadlines[i + 1].days_left);
      }
    });

    test('no past deadlines in upcoming list', () => {
      const deadlines = getUpcomingDeadlines();
      deadlines.forEach(d => {
        expect(d.days_left).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Handle functionality', () => {
    const { handleDeadline } = require('../../server/agents/deadlineAgent');
    
    test('handles form 8 message', () => {
      const res = handleDeadline('when is the form 8 correction deadline', { first_name: 'Test' });
      expect(res.agent_used).toBe('DEADLINE');
      expect(res.ui_action).toBe('show_deadline');
    });

    test('handles election message', () => {
      const res = handleDeadline('when is the election', { first_name: 'Test' });
      expect(res.agent_used).toBe('DEADLINE');
      expect(res.ui_action).toBe('show_deadline');
    });

    test('handles MCC message', () => {
      const res = handleDeadline('when is mcc enforced', { first_name: 'Test' });
      expect(res.agent_used).toBe('DEADLINE');
      expect(res.ui_action).toBe('show_deadline');
    });

    test('handles generic upcoming deadlines', () => {
      const res = handleDeadline('upcoming calendar', { first_name: 'Test' });
      expect(res.agent_used).toBe('DEADLINE');
      expect(res.response_text).toContain('upcoming');
    });

    test('handles fallback deadline query', () => {
      const res = handleDeadline('any deadline', { first_name: 'Test' });
      expect(res.agent_used).toBe('DEADLINE');
    });
  });

});
