/**
 * Fallback Agent — Catches unclassified queries with proactive suggestions
 * Ensures the user is never stuck or left without a next step.
 */

const deadlineAgent = require('./deadlineAgent');

// Suggested actions pool
const SUGGESTED_ACTIONS = [
  { id: 'check_roll', label: 'Check if my name is on the voter roll', icon: '🗳️' },
  { id: 'find_booth', label: 'Find my polling booth', icon: '📍' },
  { id: 'download_slip', label: 'Download my voter slip', icon: '📄' },
  { id: 'check_form8', label: 'Check my Form 8 status', icon: '📋' },
  { id: 'see_deadlines', label: 'See upcoming election deadlines', icon: '⏰' },
  { id: 'update_address', label: 'Update my address on the roll', icon: '🏠' },
  { id: 'report_problem', label: 'Report a problem', icon: '🚨' },
  { id: 'talk_eci', label: 'Talk to someone at ECI', icon: '📞' },
];

/**
 * Select the most contextually relevant suggestions
 */
function pickSuggestions(userProfile, count = 3) {
  const profile = userProfile || {};
  const suggestions = [];

  // Priority: incomplete profile → suggest profile actions
  if (profile.completion_pct && profile.completion_pct < 100) {
    suggestions.push(SUGGESTED_ACTIONS.find(a => a.id === 'check_roll'));
  }

  // Check for deadline proximity
  const alerts = deadlineAgent.getProactiveAlerts(profile.state || 'Tamil Nadu');
  if (alerts.length > 0) {
    suggestions.push(SUGGESTED_ACTIONS.find(a => a.id === 'see_deadlines'));
  }

  // Always useful
  suggestions.push(SUGGESTED_ACTIONS.find(a => a.id === 'find_booth'));

  // Fill remaining slots
  const remaining = SUGGESTED_ACTIONS.filter(a => !suggestions.includes(a));
  while (suggestions.length < count && remaining.length > 0) {
    suggestions.push(remaining.shift());
  }

  return suggestions.slice(0, count);
}

/**
 * Handle a fallback query
 */
function handle(message, userProfile) {
  const profile = userProfile || {};
  const suggestions = pickSuggestions(profile);

  // Check for proactive deadline trigger
  const alerts = deadlineAgent.getProactiveAlerts(profile.state || 'Tamil Nadu');
  let proactiveTrigger = false;
  let responseText = '';

  if (alerts.length > 0 && alerts[0].days_left <= 7) {
    proactiveTrigger = true;
    const nearest = alerts[0];
    responseText = `I'm not sure about that specific query, ${profile.first_name || 'dear voter'}, but I noticed you have an important deadline: ${nearest.label} in ${nearest.days_left} day${nearest.days_left !== 1 ? 's' : ''}. Want me to walk you through it? Or try one of these:`;
  } else {
    responseText = `I'm not sure about that specific detail, ${profile.first_name || 'dear voter'}, but here's what I can help you with right now. Pick any of these common actions:`;
  }

  return {
    agent_used: 'FALLBACK',
    reason: `No specialist agent matched the query: "${message.substring(0, 50)}..."`,
    suggested_actions: suggestions,
    proactive_trigger: proactiveTrigger,
    proactive_deadline: proactiveTrigger ? alerts[0] : null,
    response_text: responseText,
    ui_action: 'none',
    urgency: proactiveTrigger ? 'medium' : 'low',
    offline_safe: true,
  };
}

module.exports = { handle, SUGGESTED_ACTIONS };
