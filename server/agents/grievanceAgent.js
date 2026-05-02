/**
 * Grievance Agent — Complaint handling, escalation, and empathetic ticketing
 * Integrates with Firestore (ticket storage), Cloud Translation, and FCM.
 */

const crypto = require('crypto');

// In-memory ticket store (simulating Firestore)
const ticketStore = [];

/**
 * Generate a unique ticket ID in the format GRV-YYYYMMDD-XXXXX
 */
function generateTicketId() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const random = crypto.randomUUID().replace(/-/g, '').substring(0, 5).toUpperCase();
  return `GRV-${dateStr}-${random}`;
}

/**
 * Categorize the complaint based on message content
 */
function categorizeComplaint(message) {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('booth') || lowerMsg.includes('closed') || lowerMsg.includes('polling station')) {
    return 'booth';
  }
  if (lowerMsg.includes('name') || lowerMsg.includes('missing') || lowerMsg.includes('wrong') ||
      lowerMsg.includes('duplicate') || lowerMsg.includes('deleted') || lowerMsg.includes('roll')) {
    return 'roll';
  }
  if (lowerMsg.includes('form') || lowerMsg.includes('rejected') || lowerMsg.includes('submit') ||
      lowerMsg.includes('upload') || lowerMsg.includes('document')) {
    return 'form';
  }
  if (lowerMsg.includes('wheelchair') || lowerMsg.includes('accessible') || lowerMsg.includes('blind') ||
      lowerMsg.includes('deaf') || lowerMsg.includes('disabled') || lowerMsg.includes('sign language') ||
      lowerMsg.includes('ramp') || lowerMsg.includes('impair')) {
    return 'accessibility';
  }
  if (lowerMsg.includes('harass') || lowerMsg.includes('intimidat') || lowerMsg.includes('brib') ||
      lowerMsg.includes('threat') || lowerMsg.includes('impersonat') || lowerMsg.includes('corrupt')) {
    return 'harassment';
  }

  return 'other';
}

/**
 * Detect frustration level in the message
 */
function detectFrustration(message) {
  const lowerMsg = message.toLowerCase();
  const frustrationWords = ['angry', 'frustrated', 'terrible', 'worst', 'useless',
    'pathetic', 'nothing works', 'fed up', 'sick of', 'how many times',
    'no one', 'nobody', 'disgusting', 'shame', '!!!', '??'];

  let frustrationScore = 0;
  for (const word of frustrationWords) {
    if (lowerMsg.includes(word)) frustrationScore++;
  }

  // Exclamation marks and caps as indicators
  const exclamations = (message.match(/!/g) || []).length;
  const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;

  if (exclamations > 2) frustrationScore++;
  if (capsRatio > 0.5 && message.length > 10) frustrationScore++;

  return frustrationScore >= 2 ? 'high' : frustrationScore >= 1 ? 'medium' : 'low';
}

/**
 * Get escalation path for a category
 */
function getEscalationPath(category) {
  const paths = {
    booth: {
      contacts: [
        { name: 'Booth Level Officer (BLO)', action: 'call' },
        { name: 'ECI National Helpline', phone: '1950', action: 'call' },
      ],
      escalated: false,
    },
    roll: {
      contacts: [
        { name: 'Booth Level Officer (BLO)', action: 'call' },
        { name: 'ECI National Helpline', phone: '1950', action: 'call' },
      ],
      escalated: false,
    },
    form: {
      contacts: [
        { name: 'Booth Level Officer (BLO)', action: 'call' },
        { name: 'ECI National Helpline', phone: '1950', action: 'call' },
      ],
      escalated: false,
    },
    accessibility: {
      contacts: [
        { name: 'District Election Officer (DEO)', action: 'escalation_flag', urgency: 'HIGH' },
        { name: 'ECI National Helpline', phone: '1950', action: 'call' },
      ],
      escalated: true,
    },
    harassment: {
      contacts: [
        { name: 'cVIGIL App', action: 'deep_link', url: 'https://cvigil.eci.gov.in/' },
        { name: 'Local Police', action: 'call', phone: '100' },
        { name: 'ECI National Helpline', phone: '1950', action: 'call' },
      ],
      escalated: true,
    },
    other: {
      contacts: [
        { name: 'ECI National Helpline', phone: '1950', action: 'call' },
      ],
      escalated: false,
    },
  };

  return paths[category] || paths.other;
}

/**
 * Handle a grievance
 */
function handle(message, userProfile) {
  const profile = userProfile || {};
  const category = categorizeComplaint(message);
  const frustration = detectFrustration(message);
  const escalation = getEscalationPath(category);
  const ticketId = generateTicketId();

  // Determine urgency
  let urgency = 'medium';
  if (category === 'accessibility' || category === 'harassment') urgency = 'high';
  if (frustration === 'high') urgency = 'high';

  // Store ticket
  const ticket = {
    ticket_id: ticketId,
    user_id: profile.user_id || 'unknown',
    category,
    message,
    urgency,
    frustration_level: frustration,
    escalated: escalation.escalated,
    created_at: new Date().toISOString(),
    status: 'open',
  };
  ticketStore.push(ticket);

  // Generate empathetic response
  let responseText = '';

  if (category === 'accessibility') {
    responseText = `I understand this is important, ${profile.first_name || 'dear voter'}. Your concern has been flagged as a priority accessibility issue. I've escalated this to the District Election Officer. Reference: ${ticketId}. We take accessibility seriously.`;
  } else if (category === 'harassment') {
    responseText = `I'm sorry to hear about this, ${profile.first_name || 'dear voter'}. This is a serious matter. Your complaint (${ticketId}) has been logged and escalated. I recommend also filing a report on the cVIGIL app for immediate action. Stay safe.`;
  } else if (frustration === 'high') {
    responseText = `I completely understand your frustration, ${profile.first_name || 'dear voter'}. I've logged your complaint with ticket ID ${ticketId} and marked it as high priority. Here are your next steps: contact the BLO or call ECI helpline 1950.`;
  } else if (category === 'roll') {
    responseText = `I'm sorry to hear about this issue with the roll, ${profile.first_name || 'dear voter'}. Your complaint has been logged (${ticketId}). The BLO will be notified. You can also call the ECI helpline at 1950 for immediate assistance.`;
  } else if (category === 'form') {
    responseText = `I understand this is frustrating, ${profile.first_name || 'dear voter'}. Your complaint about the form issue has been logged (${ticketId}). Would you like me to help you re-submit with the correct details?`;
  } else {
    responseText = `Thank you for reaching out, ${profile.first_name || 'dear voter'}. Your concern has been logged with ticket ID ${ticketId}. The ECI helpline (1950) is available for immediate assistance. I'll track the status for you.`;
  }

  return {
    agent_used: 'GRIEVANCE',
    ticket_id: ticketId,
    category,
    urgency,
    frustration_level: frustration,
    escalated: escalation.escalated,
    escalation_contacts: escalation.contacts,
    response_text: responseText,
    ui_action: 'none',
    offline_safe: true,
  };
}

/**
 * Get all tickets for a user
 */
function getTickets(userId) {
  return ticketStore.filter(t => t.user_id === userId);
}

module.exports = { handle, getTickets };
