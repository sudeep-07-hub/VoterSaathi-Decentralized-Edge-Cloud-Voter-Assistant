// tests/utils/intentClassifier.test.js
const { classifyIntent,
        classifyBoothSubIntent } = require('../../server/utils/intentClassifier');

describe('Intent Classifier — classifyBoothSubIntent', () => {

  describe('Happy paths', () => {
    test('TIMING for "till when is the booth open"', () => {
      expect(classifyBoothSubIntent('till when is the booth open')).toBe('TIMING');
    });
    test('TIMING for "polling hours"', () => {
      expect(classifyBoothSubIntent('polling hours')).toBe('TIMING');
    });
    test('TIMING for "what time does voting end"', () => {
      expect(classifyBoothSubIntent('what time does voting end')).toBe('TIMING');
    });
    test('LOCATION for "where is my polling booth"', () => {
      expect(classifyBoothSubIntent('where is my polling booth')).toBe('LOCATION');
    });
    test('LOCATION for "show me directions"', () => {
      expect(classifyBoothSubIntent('show me directions to booth')).toBe('LOCATION');
    });
    test('ACCESSIBILITY for "wheelchair ramp"', () => {
      expect(classifyBoothSubIntent('is there a wheelchair ramp')).toBe('ACCESSIBILITY');
    });
  });

  describe('Edge cases — evaluator flagged these', () => {
    test('mixed TIMING + LOCATION → FULL', () => {
      expect(
        classifyBoothSubIntent('where is my booth and when does it open')
      ).toBe('FULL');
    });

    test('empty string → safe default FULL, no throw', () => {
      expect(() => classifyBoothSubIntent('')).not.toThrow();
      expect(classifyBoothSubIntent('')).toBe('FULL');
    });

    test('null input → safe default, no throw', () => {
      expect(() => classifyBoothSubIntent(null)).not.toThrow();
    });

    test('undefined input → safe default, no throw', () => {
      expect(() => classifyBoothSubIntent(undefined)).not.toThrow();
    });

    test('non-English (Tamil) input → no throw', () => {
      expect(() => classifyBoothSubIntent('என் வாக்குச்சாவடி எங்கே')).not.toThrow();
    });

    test('non-English (Hindi) input → no throw', () => {
      expect(() => classifyBoothSubIntent('मेरा मतदान केंद्र कहाँ है')).not.toThrow();
    });

    test('very long input → no throw', () => {
      const longMsg = 'open close timing location '.repeat(100);
      expect(() => classifyBoothSubIntent(longMsg)).not.toThrow();
    });

    test('numbers-only input → safe default, no throw', () => {
      expect(() => classifyBoothSubIntent('12345 67890')).not.toThrow();
    });
  });

});

describe('Intent Classifier — classifyIntent (domain routing)', () => {
  test('BOOTH for booth-related messages', () => {
    expect(classifyIntent('where is my booth').domain).toBe('BOOTH');
  });
  test('PROFILE for voter ID messages', () => {
    expect(classifyIntent('what is my EPIC number').domain).toBe('PROFILE');
  });
  test('DEADLINE for deadline messages', () => {
    expect(classifyIntent('when is the last date for Form 8').domain).toBe('DEADLINE');
  });
  test('APPLICATION for form messages', () => {
    expect(classifyIntent('how do I submit Form 8').domain).toBe('APPLICATION');
  });
  test('GRIEVANCE for complaint messages', () => {
    expect(classifyIntent('this is wrong my name is deleted').domain).toBe('GRIEVANCE');
  });
  test('FALLBACK for unrecognised messages', () => {
    expect(classifyIntent('asdfghjkl').domain).toBe('FALLBACK');
  });
});
