/**
 * Orchestrator Agent — Master Router
 * Receives every user message, classifies intent, dispatches to specialist agent,
 * and merges response with UI state payload for the frontend renderer.
 */

const { classifyIntent, detectLanguage, classifyBoothSubIntent } = require('../utils/intentClassifier');
const profileAgent = require('./profileAgent');
const boothAgent = require('./boothAgent');
const applicationAgent = require('./applicationAgent');
const deadlineAgent = require('./deadlineAgent');
const grievanceAgent = require('./grievanceAgent');
const languageAgent = require('./languageAgent');
const fallbackAgent = require('./fallbackAgent');

// Conversation history store (in-memory, keyed by user_id)
const conversationHistory = {};

/**
 * Get conversation history for a user (last 5 messages)
 */
function getHistory(userId) {
  if (!conversationHistory[userId]) {
    conversationHistory[userId] = [];
  }
  return conversationHistory[userId].slice(-10); // Last 5 user+assistant pairs
}

/**
 * Add to conversation history
 */
function addToHistory(userId, role, content) {
  if (!conversationHistory[userId]) {
    conversationHistory[userId] = [];
  }
  conversationHistory[userId].push({ role, content, timestamp: new Date().toISOString() });
  // Keep only last 10 entries (5 turns)
  if (conversationHistory[userId].length > 10) {
    conversationHistory[userId] = conversationHistory[userId].slice(-10);
  }
}

/**
 * Build UI state payload from agent response
 */
function buildUIPayload(agentResponse) {
  const payload = {
    ui_action: agentResponse.ui_action || 'none',
    urgency: agentResponse.urgency || 'low',
  };

  // Add action-specific payload
  if (agentResponse.ui_action === 'open_map' && agentResponse.maps_embed_url) {
    payload.maps_embed_url = agentResponse.maps_embed_url;
    payload.maps_directions_link = agentResponse.maps_directions_link;
    payload.booth_name = agentResponse.booth_name;
    payload.distance_km = agentResponse.distance_km;
  }

  if (agentResponse.ui_action === 'highlight_card') {
    payload.highlight_fields = agentResponse.flags || agentResponse.missing_fields || [];
  }

  if (agentResponse.ui_action === 'show_form') {
    payload.form_type = agentResponse.form_type;
    payload.prefilled_form_link = agentResponse.prefilled_form_link;
  }

  if (agentResponse.ui_action === 'show_deadline') {
    payload.nearest_deadline = agentResponse.nearest_deadline;
    payload.all_deadlines = agentResponse.all_deadlines;
  }

  return payload;
}

/**
 * Build alert card from agent response
 */
function buildAlertCard(agentResponse) {
  if (agentResponse.urgency === 'low' && agentResponse.agent_used !== 'DEADLINE') {
    return { show: false };
  }

  const levelMap = { high: 'high', medium: 'medium', low: 'low' };

  return {
    show: true,
    level: levelMap[agentResponse.urgency] || 'low',
    title: getAlertTitle(agentResponse),
    description: agentResponse.response_text.substring(0, 120),
    timestamp: new Date().toISOString(),
    agent: agentResponse.agent_used,
  };
}

/**
 * Generate alert title from agent response
 */
function getAlertTitle(response) {
  switch (response.agent_used) {
    case 'PROFILE':
      if (response.flags && response.flags.includes('address_mismatch')) return 'Address mismatch detected';
      if (response.flags && response.flags.includes('photo_pending')) return 'Photo upload pending';
      return 'Profile attention needed';
    case 'BOOTH':
      if (response.booth_changed) return 'Polling booth shifted';
      if (!response.accessible) return 'Booth accessibility concern';
      return 'Booth information updated';
    case 'APPLICATION':
      if (response.status === 'rejected') return 'Application rejected';
      if (response.status === 'under_review') return 'Application under review';
      return 'Application update';
    case 'DEADLINE':
      if (response.nearest_deadline) return response.nearest_deadline.label;
      return 'Deadline alert';
    case 'GRIEVANCE':
      return `Complaint logged: ${response.ticket_id}`;
    default:
      return 'Notification';
  }
}

/**
 * Main orchestrator handler
 * @param {object} input - Orchestrator input schema
 * @returns {object} Orchestrator output schema
 */
async function handleMessage(input) {
  const {
    user_id = 'USR-TN-001',
    message,
    device_profile = {},
  } = input;

  // Step 1: Detect language
  const langDetection = detectLanguage(message);
  let processedMessage = message;
  let userLanguage = langDetection.language;
  let languageData = null;

  // Step 2: If non-English/Hindi Indic language detected, run Language Agent
  if (langDetection.isIndic && userLanguage !== 'en') {
    languageData = await languageAgent.handle(message, userLanguage, langDetection.languageName);
    if (languageData.translated_input && languageData.confidence >= 0.70) {
      processedMessage = languageData.translated_input;
    }
  }

  // Step 3: Classify intent on the (potentially translated) message
  const intent = classifyIntent(processedMessage);

  // Step 4: Build user profile context
  const userProfile = {
    user_id,
    first_name: device_profile.name ? device_profile.name.split(' ')[0] : 'Voter',
    name: device_profile.name || 'Voter',
    constituency: device_profile.constituency || 'Hosur',
    state: device_profile.state || 'Tamil Nadu',
    booth_id: device_profile.booth_id || 'TN_KRI_42',
    completion_pct: device_profile.completion_pct || 75,
    ...device_profile,
  };

  // Step 5: Dispatch to specialist agent
  let agentResponse;

  switch (intent.domain) {
    case 'PROFILE':
      agentResponse = profileAgent.handle(processedMessage, userProfile);
      break;
    case 'BOOTH': {
      const boothSubIntent = classifyBoothSubIntent(processedMessage);
      agentResponse = await boothAgent.handle(processedMessage, userProfile, boothSubIntent);
      break;
    }
    case 'APPLICATION':
      agentResponse = applicationAgent.handle(processedMessage, userProfile);
      break;
    case 'DEADLINE':
      agentResponse = deadlineAgent.handle(processedMessage, userProfile);
      break;
    case 'GRIEVANCE':
      agentResponse = grievanceAgent.handle(processedMessage, userProfile);
      break;
    case 'FALLBACK':
    default:
      agentResponse = fallbackAgent.handle(processedMessage, userProfile);
      break;
  }

  // Step 6: Re-translate response if needed
  let finalResponseText = agentResponse.response_text;
  if (userLanguage !== 'en' && userLanguage !== 'hi') {
    const translatedBack = await languageAgent.translateBack(finalResponseText, userLanguage);
    finalResponseText = translatedBack;
  }

  // Step 7: Store conversation history
  addToHistory(user_id, 'user', message);
  addToHistory(user_id, 'assistant', finalResponseText);

  // Step 8: Build final orchestrator output
  const output = {
    agent_used: agentResponse.agent_used,
    response_text: finalResponseText,
    ui_action: agentResponse.ui_action || 'none',
    ui_payload: buildUIPayload(agentResponse),
    urgency: agentResponse.urgency || 'low',
    offline_safe: agentResponse.offline_safe !== undefined ? agentResponse.offline_safe : true,
    alert_card: buildAlertCard(agentResponse),
    voice_response_available: languageData ? languageData.voice_output_available : false,
    language: userLanguage,
    intent_classification: {
      domain: intent.domain,
      confidence: intent.confidence,
    },
    conversation_history: getHistory(user_id),
    timestamp: new Date().toISOString(),

    // Pass through agent-specific data for the frontend
    agent_data: agentResponse,
  };

  return output;
}

/**
 * Get initial dashboard data for a user
 */
function getDashboardData(userId, userProfile) {
  const profile = userProfile || {};
  const profileResult = profileAgent.handle('my profile details', profile);
  const deadlineResult = deadlineAgent.handle('upcoming deadlines', profile);
  const alerts = deadlineAgent.getProactiveAlerts(profile.state || 'Tamil Nadu');

  // Check booth changes
  const boothProfiles = require('../data/sampleProfiles.json');
  const userProfileData = boothProfiles.find(p => p.user_id === userId) || boothProfiles[0];

  return {
    profile: profileResult,
    deadlines: deadlineResult,
    proactive_alerts: alerts,
    user: {
      name: userProfileData.name,
      first_name: userProfileData.first_name,
      epic_masked: userProfileData.epic_masked,
      constituency: userProfileData.constituency,
      state: userProfileData.state,
      district: userProfileData.district,
      assembly_segment: userProfileData.assembly_segment,
      booth_id: userProfileData.booth_id,
      completion_pct: profileResult.completion_pct,
      photo_status: userProfileData.photo_status,
      language_pref: userProfileData.language_pref,
      dob: userProfileData.dob,
      gender: userProfileData.gender,
      address: userProfileData.address,
    },
    suggested_actions: fallbackAgent.SUGGESTED_ACTIONS.slice(0, 4),
  };
}

module.exports = { handleMessage, getDashboardData };
