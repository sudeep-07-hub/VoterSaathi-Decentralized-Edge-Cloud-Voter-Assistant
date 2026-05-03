// tests/utils/validate.test.js

const {
  validateChatRequest,
  validateBoothParams,
  validateGrievanceParams,
  sanitiseMessage,
  isValidBoothId
} = require('../../server/utils/validate');

describe('validateChatRequest', () => {
  test('valid request passes', () => {
    expect(validateChatRequest({ message: 'hello', user_id: 'u1' }).valid).toBe(true);
  });

  test('missing body fails', () => {
    expect(validateChatRequest(null).valid).toBe(false);
  });

  test('empty message fails', () => {
    expect(validateChatRequest({ message: '', user_id: 'u1' }).valid).toBe(false);
  });

  test('blank message fails', () => {
    expect(validateChatRequest({ message: '   ', user_id: 'u1' }).valid).toBe(false);
  });

  test('message over 2000 chars fails', () => {
    expect(validateChatRequest({ message: 'a'.repeat(2001), user_id: 'u1' }).valid).toBe(false);
  });

  test('missing user_id fails', () => {
    expect(validateChatRequest({ message: 'hello' }).valid).toBe(false);
  });

  test('non-string message fails', () => {
    expect(validateChatRequest({ message: 123, user_id: 'u1' }).valid).toBe(false);
  });

  test('error is always a descriptive string', () => {
    const { error } = validateChatRequest(null);
    expect(typeof error).toBe('string');
    expect(error.length).toBeGreaterThan(0);
  });

  test('blank user_id fails', () => {
    expect(validateChatRequest({ message: 'hello', user_id: '   ' }).valid).toBe(false);
  });

  test('valid request returns null error', () => {
    expect(validateChatRequest({ message: 'hello', user_id: 'u1' }).error).toBeNull();
  });
});

describe('validateBoothParams', () => {
  test('valid params pass', () => {
    expect(validateBoothParams({ booth_id: 'TN_KRI_42', sub_intent: 'TIMING' }).valid).toBe(true);
  });

  test('missing booth_id fails', () => {
    expect(validateBoothParams({ sub_intent: 'TIMING' }).valid).toBe(false);
  });

  test('invalid sub_intent fails', () => {
    expect(validateBoothParams({ booth_id: 'TN_KRI_42', sub_intent: 'INVALID' }).valid).toBe(false);
  });

  test('missing sub_intent is allowed', () => {
    expect(validateBoothParams({ booth_id: 'TN_KRI_42' }).valid).toBe(true);
  });

  test('null params fail gracefully', () => {
    expect(validateBoothParams(null).valid).toBe(false);
  });

  test('all valid sub_intents are accepted', () => {
    ['TIMING', 'LOCATION', 'FULL', 'ACCESSIBILITY'].forEach(si => {
      expect(validateBoothParams({ booth_id: 'TN_KRI_42', sub_intent: si }).valid).toBe(true);
    });
  });
});

describe('validateGrievanceParams', () => {
  test('valid params pass', () => {
    expect(validateGrievanceParams({ message: 'complaint' }).valid).toBe(true);
  });

  test('missing message fails', () => {
    expect(validateGrievanceParams({}).valid).toBe(false);
  });

  test('null params fail gracefully', () => {
    expect(validateGrievanceParams(null).valid).toBe(false);
  });

  test('non-string message fails', () => {
    expect(validateGrievanceParams({ message: 123 }).valid).toBe(false);
  });
});

describe('sanitiseMessage', () => {
  test('trims whitespace', () => {
    expect(sanitiseMessage('  hello  ')).toBe('hello');
  });

  test('strips control characters', () => {
    expect(sanitiseMessage('hello\x00world')).toBe('helloworld');
  });

  test('collapses multiple spaces', () => {
    expect(sanitiseMessage('hello   world')).toBe('hello world');
  });

  test('returns empty string for null', () => {
    expect(sanitiseMessage(null)).toBe('');
  });

  test('returns empty string for number', () => {
    expect(sanitiseMessage(12345)).toBe('');
  });

  test('preserves Tamil characters', () => {
    const tamil = 'என் வாக்குச்சாவடி';
    expect(sanitiseMessage(tamil)).toBe(tamil);
  });

  test('preserves Hindi characters', () => {
    const hindi = 'मेरा मतदान केंद्र';
    expect(sanitiseMessage(hindi)).toBe(hindi);
  });
});

describe('isValidBoothId', () => {
  test('valid booth ID passes', () => {
    expect(isValidBoothId('TN_KRI_42')).toBe(true);
  });

  test('lowercase fails', () => {
    expect(isValidBoothId('tn_kri_42')).toBe(false);
  });

  test('missing part number fails', () => {
    expect(isValidBoothId('TN_KRI')).toBe(false);
  });

  test('null fails gracefully', () => {
    expect(isValidBoothId(null)).toBe(false);
  });

  test('number input fails gracefully', () => {
    expect(isValidBoothId(42)).toBe(false);
  });
});
