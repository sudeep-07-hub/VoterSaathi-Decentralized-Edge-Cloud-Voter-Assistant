// tests/agents/applicationAgent.test.js
const { decideForm, getApplicationStatus } = require('../../server/agents/applicationAgent');

describe('Application Agent — form decision tree', () => {

  test('returns Form 6 for new registration intent', () => {
    expect(decideForm('I am not registered yet')).toBe('Form 6');
    expect(decideForm('I want to register as a new voter')).toBe('Form 6');
  });

  test('returns Form 7 for deletion objection', () => {
    expect(decideForm('my name was wrongly deleted')).toBe('Form 7');
    expect(decideForm('I want to object to my deletion')).toBe('Form 7');
  });

  test('returns Form 8 for correction intent', () => {
    expect(decideForm('I want to correct my address')).toBe('Form 8');
    expect(decideForm('my name is spelt wrong on the roll')).toBe('Form 8');
  });

  test('returns Form 8A for transposition intent', () => {
    expect(decideForm('I moved within the same constituency')).toBe('Form 8A');
  });

  test('application status state machine covers all states', () => {
    const states = ['not_started', 'draft', 'submitted', 'under_review', 'accepted', 'rejected'];
    states.forEach(state => {
      const result = getApplicationStatus('app_test_001', state);
      expect(result.status).toBe(state);
      expect(result.next_step).toBeTruthy();
    });
  });

  test('rejected status returns rejection reason and re-submit offer', () => {
    const result = getApplicationStatus('app_test_002', 'rejected', 'Blurry photo uploaded');
    expect(result.rejection_reason).toBe('Blurry photo uploaded');
    expect(result.response_text).toMatch(/re-submit|resubmit|correct/i);
  });

});
