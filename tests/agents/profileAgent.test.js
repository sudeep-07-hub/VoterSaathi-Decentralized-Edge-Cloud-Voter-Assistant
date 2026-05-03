// tests/agents/profileAgent.test.js
const { handleProfile, calculateCompleteness,
        maskEPIC, detectAddressMismatch } = require('../../server/agents/profileAgent');

describe('Profile Agent', () => {

  describe('EPIC masking', () => {
    test('masks all but last 3 characters', () => {
      expect(maskEPIC('TN/24/004123')).toBe('TN/24/004●●●');
    });
    test('handles already-masked input safely', () => {
      expect(() => maskEPIC('TN/24/004●●●')).not.toThrow();
    });
    test('returns safe placeholder for null input', () => {
      expect(maskEPIC(null)).toBe('●●●●●●●●●');
    });
  });

  describe('Completeness scoring', () => {
    test('returns 100% for fully complete profile', () => {
      const profile = {
        name: 'Arjun Mehta', dob: '1992-08-15',
        aadhaar_linked: true, address_proof: true,
        photo: true, mobile_verified: true, email: 'a@b.com'
      };
      expect(calculateCompleteness(profile)).toBe(100);
    });

    test('returns 60% when address_proof and photo missing', () => {
      const profile = {
        name: 'Arjun Mehta', dob: '1992-08-15',
        aadhaar_linked: true, address_proof: false,
        photo: false, mobile_verified: true, email: null
      };
      expect(calculateCompleteness(profile)).toBe(60);
    });

    test('returns 0% for completely empty profile', () => {
      expect(calculateCompleteness({})).toBe(0);
    });
  });

  describe('Address mismatch detection', () => {
    test('flags mismatch when local address differs from Aadhaar address', () => {
      const result = detectAddressMismatch(
        '12 Nehru Nagar, Hosur',
        '45 MG Road, Bengaluru'
      );
      expect(result.mismatch).toBe(true);
      expect(result.suggested_form).toBe('Form 8');
    });

    test('no flag when addresses match', () => {
      const result = detectAddressMismatch(
        '12 Nehru Nagar, Hosur',
        '12 Nehru Nagar, Hosur'
      );
      expect(result.mismatch).toBe(false);
    });
  });

  describe('Voter card trigger', () => {
    test('sets ui_action to open_voter_card_modal', async () => {
      const result = await handleProfile({
        message: 'show my voter card',
        user_profile: { name: 'Arjun Mehta', epic_masked: 'TN/24/004●●●' }
      });
      expect(result.ui_action).toBe('open_voter_card_modal');
      expect(result.voter_card_data).toBeDefined();
    });
  });

  describe('Handle functionality', () => {
    test('handles missing fields message', async () => {
      const res = await handleProfile('what is missing in my profile');
      expect(res.response_text).toContain('complete');
    });

    test('handles address mismatch message', async () => {
      const res = await handleProfile('is my address matching');
      expect(res.response_text).toContain('address');
    });

    test('handles photo query', async () => {
      const res = await handleProfile('what about my photo');
      expect(res.response_text).toContain('photo status');
    });

    test('handles aadhaar query', async () => {
      const res = await handleProfile('is my aadhaar linked');
      expect(res.response_text).toMatch(/Aadhaar|aadhar/i);
    });

    test('handles general profile query', async () => {
      const res = await handleProfile('tell me my profile');
      expect(res.response_text).toContain('registered in');
    });
  });

});
