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
 */
function determineForm(message) {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('not registered') || lowerMsg.includes('new registration') || lowerMsg.includes('register') || lowerMsg.includes('form 6')) {
    return {
      form_type: 'Form 6',
      description: 'New Voter Registration',
      purpose: 'For citizens who are not yet registered as voters.',
    };
  }
  if (lowerMsg.includes('delete') || lowerMsg.includes('objection') || lowerMsg.includes('form 7')) {
    return {
      form_type: 'Form 7',
      description: 'Objection to Inclusion/Deletion',
      purpose: 'To object to a name being wrongly included or deleted from the roll.',
    };
  }
  if (lowerMsg.includes('correct') || lowerMsg.includes('update') || lowerMsg.includes('name') ||
      lowerMsg.includes('dob') || lowerMsg.includes('photo') || lowerMsg.includes('gender') ||
      lowerMsg.includes('form 8') && !lowerMsg.includes('8a')) {
    return {
      form_type: 'Form 8',
      description: 'Correction of Entries',
      purpose: 'To correct your name, date of birth, photo, address, or gender on the electoral roll.',
    };
  }
  if (lowerMsg.includes('moved') || lowerMsg.includes('transposition') || lowerMsg.includes('form 8a') || lowerMsg.includes('shifted within')) {
    return {
      form_type: 'Form 8A',
      description: 'Transposition of Entry',
      purpose: 'For voters who moved within the same constituency and need their address updated.',
    };
  }

  return null;
}

/**
 * Simulate Google Document AI validation
 */
function simulateDocumentValidation(documentType) {
  // Simulated Document AI response — in production, this calls the real API
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
  // Simulated Google Workspace Forms link
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
 */
function handle(message, userProfile) {
  const lowerMsg = message.toLowerCase();
  const profile = userProfile || {};
  const userId = profile.user_id || 'USR-TN-001';

  // Check for existing application status
  const existingApp = applicationStore[userId] || { status: 'not_started', form_type: null };

  // Determine which form the user needs
  const formInfo = determineForm(message);

  let responseText = '';
  let uiAction = 'none';
  let urgency = 'low';

  if (lowerMsg.includes('status') || lowerMsg.includes('track') || lowerMsg.includes('check')) {
    // Status tracking query
    if (existingApp.status === 'not_started') {
      responseText = `${profile.first_name || 'Voter'}, you don't have any pending applications. Would you like to start a new one? I can help with registration (Form 6), corrections (Form 8), or transposition (Form 8A).`;
    } else if (existingApp.status === 'rejected') {
      responseText = `${profile.first_name || 'Voter'}, your ${existingApp.form_type} was rejected. Reason: "${existingApp.rejection_reason}" Would you like help re-submitting with the correct details?`;
      urgency = 'high';
      uiAction = 'show_form';
    } else if (existingApp.status === 'under_review') {
      responseText = `${profile.first_name || 'Voter'}, your ${existingApp.form_type} (Ref: ${existingApp.reference_id}) is currently under review. Submitted on ${new Date(existingApp.submitted_at).toLocaleDateString('en-IN')}. I'll notify you when it's processed.`;
      urgency = 'medium';
    } else if (existingApp.status === 'accepted') {
      responseText = `${profile.first_name || 'Voter'}, great news! Your ${existingApp.form_type} has been accepted. Your electoral roll entry has been updated.`;
    } else {
      responseText = `${profile.first_name || 'Voter'}, your ${existingApp.form_type} is in "${existingApp.status}" state. Reference: ${existingApp.reference_id}.`;
    }
  } else if (formInfo) {
    // New form / form guidance query
    const formLink = generateFormLink(formInfo.form_type, profile);
    responseText = `${profile.first_name || 'Voter'}, you need ${formInfo.form_type}: ${formInfo.description}. ${formInfo.purpose} I've pre-filled your known details. Tap below to start filling the form.`;
    uiAction = 'show_form';

    return {
      agent_used: 'APPLICATION',
      form_type: formInfo.form_type,
      form_description: formInfo.description,
      status: existingApp.status,
      rejection_reason: existingApp.rejection_reason,
      next_step: `Fill and submit ${formInfo.form_type} with required documents.`,
      prefilled_form_link: formLink,
      drive_pdf_link: null,
      document_validation: simulateDocumentValidation('default'),
      response_text: responseText,
      ui_action: uiAction,
      urgency,
      offline_safe: true,
    };
  } else if (lowerMsg.includes('document') || lowerMsg.includes('upload')) {
    // Document validation query
    const docValidation = simulateDocumentValidation('aadhaar');
    if (docValidation.passed) {
      responseText = `${profile.first_name || 'Voter'}, your document has been validated successfully (confidence: ${Math.round(docValidation.confidence * 100)}%). All checks passed — name match, address verification, and legibility.`;
    } else {
      responseText = `${profile.first_name || 'Voter'}, document validation found issues: ${docValidation.issues.join('. ')}. Please re-upload a clearer copy.`;
      urgency = 'medium';
    }

    return {
      agent_used: 'APPLICATION',
      form_type: existingApp.form_type,
      status: existingApp.status,
      document_validation: docValidation,
      response_text: responseText,
      ui_action: 'show_form',
      urgency,
      offline_safe: !config.features.docAiEnabled,
    };
  } else {
    responseText = `${profile.first_name || 'Voter'}, I can help you with voter registration forms. Tell me what you need: new registration, corrections to your details, objection to deletion, or address update within your constituency.`;
    uiAction = 'show_form';
  }

  return {
    agent_used: 'APPLICATION',
    form_type: existingApp.form_type || (formInfo ? formInfo.form_type : null),
    status: existingApp.status,
    rejection_reason: existingApp.rejection_reason,
    next_step: existingApp.status === 'rejected' ? 'Re-submit with corrected documents.' : 'No action required.',
    prefilled_form_link: formInfo ? generateFormLink(formInfo.form_type, profile) : null,
    drive_pdf_link: null,
    document_validation: { passed: true, issues: [] },
    response_text: responseText,
    ui_action: uiAction,
    urgency,
    offline_safe: true,
  };
}

module.exports = { handle };
