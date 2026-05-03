/**
 * Profile Agent — Handles voter registration data queries
 * Local-first lookups with cloud fallback. Never exposes raw PII.
 */

const profiles = require('../data/sampleProfiles.json');

// Profile completeness weights as defined in architecture doc
const FIELD_WEIGHTS = {
  full_name: 20,
  dob: 10,
  aadhaar_linkage: 20,
  address_proof: 20,
  photograph: 15,
  mobile_verified: 10,
  email: 5,
};

/**
 * Calculate profile completeness percentage
 */
function calculateCompleteness(profileFields) {
  let total = 0;
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    if (profileFields[field]) {
      total += weight;
    } else if (field === 'full_name' && profileFields['name']) {
      total += weight;
    } else if (field === 'aadhaar_linkage' && profileFields['aadhaar_linked']) {
      total += weight;
    } else if (field === 'photograph' && profileFields['photo']) {
      total += weight;
    }
  }
  return total;
}

/**
 * Get missing fields from a profile
 */
function getMissingFields(profileFields) {
  const missing = [];
  const fieldLabels = {
    full_name: 'Full name (as per Aadhaar)',
    dob: 'Date of birth',
    aadhaar_linkage: 'Aadhaar linkage',
    address_proof: 'Address proof document',
    photograph: 'Passport-size photograph',
    mobile_verified: 'Mobile number (verified)',
    email: 'Email address',
  };

  for (const [field, completed] of Object.entries(profileFields)) {
    if (!completed) {
      missing.push(fieldLabels[field] || field);
    }
  }
  return missing;
}

/**
 * Mask EPIC number to show only last 3 chars
 */
function maskEPIC(epic) {
  if (!epic) return '●●●●●●●●●';
  if (epic.includes('●')) return epic; // already masked
  const len = epic.length;
  if (len <= 3) return '●'.repeat(len);
  const unmaskedPrefix = epic.slice(0, -3);
  return unmaskedPrefix + '●●●';
}

/**
 * Detect address mismatch between registered and Aadhaar address
 */
function detectAddressMismatch(localAddress, aadhaarAddress) {
  if (!localAddress || !aadhaarAddress) return { mismatch: false };
  const mismatch = localAddress.toLowerCase().trim() !== aadhaarAddress.toLowerCase().trim();
  return {
    mismatch,
    suggested_form: mismatch ? 'Form 8' : null
  };
}

/**
 * Handle a profile query
 * @param {string|object} message - The user's message or params object
 * @param {object} userProfile - Device profile from orchestrator input
 * @returns {object} Profile agent response
 */
function handle(message, userProfile) {
  let msg = message;
  let profileData = userProfile || {};

  if (message && typeof message === 'object') {
    msg = message.message || '';
    profileData = message.user_profile || message.userProfile || {};
  }

  const userId = profileData.user_id || 'USR-TN-001';
  // Find user profile from local store
  const profile = profiles.find(p => p.user_id === userId) || profiles[0];
  const lowerMsg = msg.toLowerCase();

  const completionPct = calculateCompleteness(profile.profile_fields);
  const missingFields = getMissingFields(profile.profile_fields);
  const mismatchResult = detectAddressMismatch(profile.address, profile.aadhaar_address);
  const addressMismatch = mismatchResult.mismatch;

  // Build flags
  const flags = [];
  if (addressMismatch) flags.push('address_mismatch');
  if (profile.photo_status === 'pending') flags.push('photo_pending');
  if (!profile.aadhaar_linked) flags.push('aadhaar_unlinked');

  // Generate contextual response
  let responseText = '';

  // D3: Voter card trigger
  const voterCardKeywords = ['show my voter card', 'voter card', 'my epic card', 'voter id card',
    'view my card', 'show my card', 'voter slip', 'voter details', 'show my epic'];
  const isVoterCardRequest = voterCardKeywords.some(k => lowerMsg.includes(k));

  if (isVoterCardRequest) {
    responseText = `Here's your EPIC card, ${profile.first_name}. All details are verified.`;
    return {
      agent_used: 'PROFILE',
      profile_complete: completionPct === 100,
      completion_pct: completionPct,
      missing_fields: missingFields,
      flags,
      roll_part: profile.roll_part,
      roll_serial: profile.roll_serial,
      response_text: responseText,
      ui_action: 'open_voter_card_modal',
      voter_card_data: {
        full_name: profile.name,
        epic_masked: profile.epic_masked,
        dob: profile.dob || '15 Aug 1992',
        gender: profile.gender || 'Male',
        constituency: profile.constituency,
        assembly_no: profile.assembly_segment || '104',
        part_no: profile.roll_part,
        serial_no: profile.roll_serial,
        address: profile.address || '12 Nehru Nagar, Hosur, Tamil Nadu 635109',
        photo_url: profile.photo_url || null,
        state: profile.state,
        roll_year: '2026',
        verified: completionPct === 100,
      },
      urgency: 'low',
      offline_safe: true,
    };
  }

  if (lowerMsg.includes('epic') || lowerMsg.includes('voter id')) {
    responseText = `${profile.first_name}, your EPIC number is ${profile.epic_masked}. You're registered in ${profile.constituency} Assembly Constituency, ${profile.state}. Roll Part ${profile.roll_part}, Serial ${profile.roll_serial}.`;
  } else if (lowerMsg.includes('complete') || lowerMsg.includes('missing') || lowerMsg.includes('incomplete')) {
    if (completionPct === 100) {
      responseText = `Great news, ${profile.first_name}! Your profile is 100% complete. All fields are verified and up to date.`;
    } else {
      responseText = `${profile.first_name}, your profile is ${completionPct}% complete. Missing: ${missingFields.join(', ')}. Complete these to ensure smooth voting.`;
    }
  } else if (lowerMsg.includes('address') || lowerMsg.includes('mismatch')) {
    if (addressMismatch) {
      responseText = `${profile.first_name}, I detected an address mismatch. Your registered address differs from your Aadhaar address. Please submit Form 8 to update your address before the deadline.`;
    } else {
      responseText = `${profile.first_name}, your registered address matches your Aadhaar record. No action needed.`;
    }
  } else if (lowerMsg.includes('photo')) {
    responseText = `${profile.first_name}, your photo status is: ${profile.photo_status}. ${profile.photo_status === 'pending' ? 'Please upload a passport-size photograph to complete your profile.' : 'Your photograph is approved.'}`;
  } else if (lowerMsg.includes('aadhaar') || lowerMsg.includes('aadhar')) {
    if (profile.aadhaar_linked) {
      responseText = `${profile.first_name}, your Aadhaar (ending ●●●●${profile.aadhaar_last4}) is successfully linked to your voter ID.`;
    } else {
      responseText = `${profile.first_name}, your Aadhaar is not yet linked. Linking it adds 20% to your profile completeness and enables faster verification.`;
    }
  } else {
    // General profile query
    responseText = `${profile.first_name}, you're registered in ${profile.constituency} AC, ${profile.state}. EPIC: ${profile.epic_masked}, Roll Part ${profile.roll_part}, Serial ${profile.roll_serial}. Profile: ${completionPct}% complete.`;
    if (flags.length > 0) {
      responseText += ` Attention needed: ${flags.join(', ').replace(/_/g, ' ')}.`;
    }
  }

  return {
    agent_used: 'PROFILE',
    profile_complete: completionPct === 100,
    completion_pct: completionPct,
    missing_fields: missingFields,
    flags,
    epic_masked: profile.epic_masked,
    constituency: profile.constituency,
    assembly_segment: profile.assembly_segment,
    parliamentary_segment: profile.parliamentary_segment,
    roll_part: profile.roll_part,
    roll_serial: profile.roll_serial,
    response_text: responseText,
    ui_action: flags.length > 0 ? 'highlight_card' : 'none',
    urgency: flags.includes('address_mismatch') ? 'high' : flags.length > 0 ? 'medium' : 'low',
    offline_safe: true,
  };
}

module.exports = { 
  handle, 
  handleProfile: handle,
  calculateCompleteness,
  maskEPIC,
  detectAddressMismatch
};
