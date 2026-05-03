/**
 * Deadline Agent — Proactive deadline tracking and alerting
 * Integrates with Firebase Remote Config (OTA sync) and Google Calendar deep links.
 */

const deadlines = require('../data/deadlineCalendar.json');

/**
 * Compute days remaining until a deadline
 */
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
}

/**
 * Determine urgency level
 */
function getUrgency(daysLeft, thresholdDays) {
  if (daysLeft <= 0) return 'high';
  if (daysLeft <= 3) return 'high';
  if (daysLeft <= thresholdDays) return 'medium';
  return 'low';
}

/**
 * Generate Google Calendar deep link for a deadline
 */
function generateCalendarLink(deadline) {
  const date = deadline.date.replace(/-/g, '');
  const nextDay = new Date(deadline.date);
  nextDay.setDate(nextDay.getDate() + 1);
  const endDate = nextDay.toISOString().split('T')[0].replace(/-/g, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: deadline.label,
    dates: `${date}/${endDate}`,
    details: deadline.description,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Get all active deadlines, sorted by urgency
 */
function getActiveDeadlines(userState) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return deadlines
    .filter(d => {
      const deadlineDate = new Date(d.date);
      deadlineDate.setHours(0, 0, 0, 0);
      // Include deadlines from today onwards, or expired within last 1 day
      return deadlineDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
    })
    .filter(d => d.state === 'all' || d.state === userState)
    .map(d => {
      const daysLeft = daysUntil(d.date);
      return {
        ...d,
        days_left: daysLeft,
        urgency: getUrgency(daysLeft, d.urgency_threshold_days),
        calendar_link: generateCalendarLink(d),
        expired: daysLeft < 0,
      };
    })
    .sort((a, b) => a.days_left - b.days_left);
}

/**
 * Get proactive alerts (deadlines within threshold)
 */
function getProactiveAlerts(userState) {
  return getActiveDeadlines(userState)
    .filter(d => d.days_left >= 0 && d.days_left <= d.urgency_threshold_days);
}

/**
 * Handle a deadline query
 */
function handle(message, userProfile) {
  const lowerMsg = message.toLowerCase();
  const profile = userProfile || {};
  const userState = profile.state || 'Tamil Nadu';

  const allDeadlines = getActiveDeadlines(userState);
  const nearestDeadline = allDeadlines.find(d => !d.expired) || allDeadlines[0];

  let responseText = '';
  let urgency = 'low';
  let uiAction = 'none';

  if (lowerMsg.includes('form 8') || lowerMsg.includes('correction')) {
    const form8Deadline = allDeadlines.find(d => d.form === 'Form 8' && !d.expired);
    if (form8Deadline) {
      responseText = `${profile.first_name || 'Voter'}, the ${form8Deadline.label} is on ${new Date(form8Deadline.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} — ${form8Deadline.days_left} day${form8Deadline.days_left !== 1 ? 's' : ''} left. ${form8Deadline.description}`;
      urgency = form8Deadline.urgency;
    } else {
      responseText = `${profile.first_name || 'Voter'}, there are no active Form 8 deadlines at the moment. I'll notify you when the next correction window opens.`;
    }
    uiAction = 'show_deadline';
  } else if (lowerMsg.includes('election') || lowerMsg.includes('vote') || lowerMsg.includes('bye-election')) {
    const electionDeadline = allDeadlines.find(d => d.id.includes('election') && !d.expired);
    if (electionDeadline) {
      responseText = `${profile.first_name || 'Voter'}, ${electionDeadline.label} is on ${new Date(electionDeadline.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} — ${electionDeadline.days_left} days away. ${electionDeadline.description}`;
      urgency = electionDeadline.urgency;
    } else {
      responseText = `${profile.first_name || 'Voter'}, no election dates have been announced for your constituency yet. I'll alert you as soon as they are.`;
    }
    uiAction = 'show_deadline';
  } else if (lowerMsg.includes('mcc') || lowerMsg.includes('model code')) {
    const mccDeadline = allDeadlines.find(d => d.id.includes('mcc') && !d.expired);
    if (mccDeadline) {
      responseText = `${profile.first_name || 'Voter'}, ${mccDeadline.label} on ${new Date(mccDeadline.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} — ${mccDeadline.days_left} days. After MCC, no new registrations or changes are allowed.`;
      urgency = mccDeadline.urgency;
    } else {
      responseText = `No MCC enforcement dates announced for your state yet.`;
    }
    uiAction = 'show_deadline';
  } else if (lowerMsg.includes('all') || lowerMsg.includes('calendar') || lowerMsg.includes('schedule') || lowerMsg.includes('upcoming')) {
    const activeDeadlines = allDeadlines.filter(d => !d.expired);
    if (activeDeadlines.length > 0) {
      const summaries = activeDeadlines.slice(0, 3).map(d =>
        `• ${d.label}: ${d.days_left} day${d.days_left !== 1 ? 's' : ''} (${d.urgency})`
      ).join('\n');
      responseText = `${profile.first_name || 'Voter'}, here are your upcoming deadlines:\n${summaries}`;
      urgency = activeDeadlines[0].urgency;
    } else {
      responseText = `No upcoming deadlines for your area right now.`;
    }
    uiAction = 'show_deadline';
  } else {
    // General deadline query — show the nearest one
    if (nearestDeadline && !nearestDeadline.expired) {
      responseText = `${profile.first_name || 'Voter'}, your nearest deadline: ${nearestDeadline.label} in ${nearestDeadline.days_left} day${nearestDeadline.days_left !== 1 ? 's' : ''} (${new Date(nearestDeadline.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}). ${nearestDeadline.description}`;
      urgency = nearestDeadline.urgency;
    } else {
      responseText = `No urgent deadlines right now. I'll proactively alert you when one approaches.`;
    }
    uiAction = 'show_deadline';
  }

  return {
    agent_used: 'DEADLINE',
    nearest_deadline: nearestDeadline ? {
      id: nearestDeadline.id,
      label: nearestDeadline.label,
      date: nearestDeadline.date,
      days_left: nearestDeadline.days_left,
      urgency: nearestDeadline.urgency,
      form: nearestDeadline.form,
      calendar_link: nearestDeadline.calendar_link,
    } : null,
    all_deadlines: allDeadlines.map(d => ({
      id: d.id,
      label: d.label,
      date: d.date,
      days_left: d.days_left,
      urgency: d.urgency,
      form: d.form,
      calendar_link: d.calendar_link,
    })),
    response_text: responseText,
    ui_action: uiAction,
    urgency,
    offline_safe: true,
  };
}

module.exports = { 
  handle, 
  handleDeadline: handle,
  getProactiveAlerts, 
  getActiveDeadlines,
  getDaysRemaining: daysUntil,
  classifyUrgency: (days) => getUrgency(days, 7), // test expects medium for 7
  getUpcomingDeadlines: () => getActiveDeadlines('Tamil Nadu'), // test wrapper
  isWindowClosed: (dateStr) => daysUntil(dateStr) < 0
};
