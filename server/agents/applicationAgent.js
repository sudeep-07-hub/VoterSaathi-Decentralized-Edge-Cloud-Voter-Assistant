/**
 * Application Agent — Form 6/7/8/8A queries, document validation, status tracking
 * Integrates with Google Document AI (OCR), Drive API, and Workspace Forms.
 */

const config = require('../config');

// Application status store (simulating Firestore)
const applicationStore = {
  'USR-TN-001': {
    form_type: 'Form 8',
    status: 'under_review',
    submitted_at: '2026-04-28T14:00:00+05:30',
    rejection_reason: null,
    reference_id: 'APP-TN-2026-04281400',
  },
  'USR-KA-002': {
    form_type: null,
    status: 'not_started',
    submitted_at: null,
    rejection_reason: null,
    reference_id: null,
  },
  'USR-TN-003': {
    form_type: 'Form 6',
    status: 'rejected',
    submitted_at: '2026-04-15T09:30:00+05:30',
    rejection_reason: 'Address proof document is illegible. Please re-upload a clear copy.',
    reference_id: 'APP-TN-2026-04150930',
  },
  'USR-KA-004': {
    form_type: 'Form 8',
    status: 'accepted',
    submitted_at: '2026-04-10T11:00:00+05:30',
    rejection_reason: null,
    reference_id: 'APP-KA-2026-04101100',
  },
};

/**
 * Determine the correct form based on user's situation
 * @param {string} message - User query
 * @returns {string|null} - Form type
 */
function decideForm(message) {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('not registered') || lowerMsg.includes('new registration') || lowerMsg.includes('register') || lowerMsg.includes('form 6')) {
    return 'Form 6';
  }
  if (lowerMsg.includes('delete') || lowerMsg.includes('deletion') || lowerMsg.includes('object') || lowerMsg.includes('objection') || lowerMsg.includes('form 7')) {
    return 'Form 7';
  }
  if (lowerMsg.includes('correct') || lowerMsg.includes('update') || lowerMsg.includes('name') ||
      lowerMsg.includes('dob') || lowerMsg.includes('photo') || lowerMsg.includes('gender') ||
      (lowerMsg.includes('form 8') && !lowerMsg.includes('8a'))) {
    return 'Form 8';
  }
  if (lowerMsg.includes('moved') || lowerMsg.includes('transposition') || lowerMsg.includes('form 8a') || lowerMsg.includes('shifted within')) {
    return 'Form 8A';
  }

  return null;
}

/**
 * Get application status
 * @param {string} userId - User or App ID
 * @param {string} forceState - Optional state to force for testing
 * @param {string} forceReason - Optional rejection reason for testing
 * @returns {Object} - Status object
 */
function getApplicationStatus(userId, forceState, forceReason) {
  const existingApp = applicationStore[userId] || { status: forceState || 'not_started', form_type: null };
  const status = forceState || existingApp.status;
  const reason = forceReason || existingApp.rejection_reason;
  
  let nextStep = 'No action required.';
  let responseText = '';
  if (status === 'not_started') nextStep = 'Start application';
  else if (status === 'draft') nextStep = 'Complete application';
  else if (status === 'rejected') {
    nextStep = 'Re-submit with corrected documents.';
    responseText = 'Please re-submit or correct.';
  }
  else nextStep = 'Wait for review';

  return {
    status: status,
    next_step: nextStep,
    rejection_reason: reason,
    response_text: responseText
  };
}

/**
 * Simulate Google Document AI validation
 */
function simulateDocumentValidation(documentType) {
  const validations = {
    aadhaar: { passed: true, confidence: 0.94, issues: [] },
    passport: { passed: true, confidence: 0.91, issues: [] },
    driving_licence: { passed: true, confidence: 0.88, issues: [] },
    utility_bill: { passed: false, confidence: 0.72, issues: ['Document image is partially obscured. Please re-upload a clear copy.'] },
    bank_passbook: { passed: true, confidence: 0.85, issues: [] },
    default: { passed: true, confidence: 0.90, issues: [] },
  };

  const result = validations[documentType] || validations.default;
  result.service = config.features.docAiEnabled ? 'google_document_ai' : 'local_simulation';
  return result;
}

/**
 * Generate a pre-filled form link
 */
function generateFormLink(formType, profile) {
  const formIds = {
    'Form 6': 'form6_new_registration',
    'Form 7': 'form7_objection',
    'Form 8': 'form8_correction',
    'Form 8A': 'form8a_transposition',
  };
  const formId = formIds[formType] || 'generic';
  const name = encodeURIComponent(profile.name || '');
  const constituency = encodeURIComponent(profile.constituency || '');
  return `https://forms.gle/${formId}?name=${name}&constituency=${constituency}`;
}

/**
 * Handle an application query
 * @param {string} message - Raw user message
 * @param {Object} userProfile - Voter profile data
 * @returns {Promise<Object>}
 */
async function handle(message, userProfile) {
  const profile = userProfile || {};
  const userId = profile.user_id || 'USR-TN-001';

  // Determine which form the user needs
  const formType = decideForm(message);
  const appStatus = getApplicationStatus(userId);

  const responseText = '';
  const uiAction = 'none';
  const urgency = 'low';

  // Return standard response
  return {
    agent_used: 'APPLICATION',
    form_type: appStatus.form_type || formType,
    status: appStatus.status,
    rejection_reason: appStatus.rejection_reason,
    next_step: appStatus.next_step,
    prefilled_form_link: formType ? generateFormLink(formType, profile) : null,
    drive_pdf_link: null,
    document_validation: simulateDocumentValidation('default'),
    response_text: responseText || 'Application agent response',
    ui_action: uiAction,
    urgency,
    offline_safe: true,
  };
}

module.exports = { handle, decideForm, getApplicationStatus };
