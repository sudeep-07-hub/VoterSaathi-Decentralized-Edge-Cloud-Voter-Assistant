// tests/agents/languageAgent.test.js
const { detectLanguage, translateToEnglish, translateBack, handleLanguage } = require('../../server/agents/languageAgent');

describe('Language Agent', () => {

  test('detects English correctly', async () => {
    const result = await detectLanguage('where is my polling booth');
    expect(result.detected_language).toBe('en');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('detects Tamil correctly', async () => {
    const result = await detectLanguage('என் வாக்குச்சாவடி எங்கே');
    expect(result.detected_language).toBe('ta');
  });

  test('handles empty string without throwing', async () => {
    await expect(detectLanguage('')).resolves.toBeDefined();
  });

  test('translation returns English text for Tamil input', async () => {
    const result = await translateToEnglish(
      'என் வாக்குச்சாவடி எங்கே', 'ta'
    );
    expect(result.translated_input).toBeTruthy();
    expect(typeof result.translated_input).toBe('string');
  });

});
