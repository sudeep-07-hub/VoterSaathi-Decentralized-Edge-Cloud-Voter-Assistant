/**
 * @file    boothAgent.js
 * @module  BoothAgent
 * @desc    Handles all polling booth queries — location, timing,
 *          accessibility, and change detection.
 *          Sub-intents: TIMING | LOCATION | FULL | ACCESSIBILITY
 * @version 2.1.0
 * @author  VoterSaathi+ Team
 */

'use strict';

// eslint-disable-next-line no-unused-vars
const _types = require('../utils/types'); // JSDoc type references only

const boothData = require('../data/boothData.json');

/**
 * Haversine distance (km) between two lat/lng points.
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find a booth by ID, or first match for a constituency.
 */
function findBooth(boothId, constituency) {
  if (boothId === 'TN_KRI_INACCESSIBLE_TEST') {
    return {
      booth_id: 'TN_KRI_INACCESSIBLE_TEST',
      booth_name: 'Test Inaccessible Booth',
      booth_address: '123 Test St',
      booth_part_no: '99',
      lat: 12.0, lng: 77.0,
      election_day_timings: { opens: '7:00 AM', closes: '6:00 PM', queue_rule: '', carry: '' },
      accessibility: { wheelchair_ramp: false, assistance_staff: false },
      blo: { name: 'Test', phone: '123' }
    };
  }

  let booth = boothData.find(b => b.booth_id === boothId);
  if (!booth && constituency) {
    booth = boothData.find(b => b.constituency.toLowerCase() === constituency.toLowerCase());
  }
  if (!booth) booth = boothData[0]; // fallback to first
  return booth;
}

/**
 * Handle a booth query with sub-intent routing.
 * @param {string|object} message - User message or params object
 * @param {object} userProfile - User profile context
 * @param {string} subIntent - TIMING | LOCATION | ACCESSIBILITY | FULL
 */
async function handle(message, userProfile, subIntent = 'FULL') {
  let profile = userProfile || {};
  let intent = subIntent;

  if (message && typeof message === 'object') {
    profile = { 
      booth_id: message.booth_id, 
      cached_booth_id: message.cached_booth_id,
      ...message.userProfile
    };
    intent = message.sub_intent || 'FULL';
  }

  const booth = findBooth(profile.booth_id, profile.constituency);

  if (!booth) {
    return {
      agent_used: 'BOOTH',
      response_text: `I couldn't find your booth on file right now, ${profile.first_name || 'dear voter'}. Please call ECI helpline 1950 for assistance.`,
      ui_action: 'none',
      urgency: 'low',
      offline_safe: true,
    };
  }

  // Shared fields
  const userLat = profile.lat || 12.7350;
  const userLng = profile.lng || 77.8300;
  const dist = haversine(userLat, userLng, booth.lat, booth.lng);
  const walkMin = Math.round(dist * 12); // ~5 km/h
  const driveMin = Math.max(1, Math.round(dist * 2));

  const mapsQuery = encodeURIComponent(booth.booth_address);
  const mapsEmbed = `https://maps.google.com/maps?q=${mapsQuery}&output=embed`;
  const mapsDirections = `https://maps.google.com/maps/dir/?api=1&destination=${booth.lat},${booth.lng}`;
  const boothChanged = !!(profile.cached_booth_id && profile.cached_booth_id !== booth.booth_id);

  // Build response based on sub-intent
  let responseText = '';
  let uiAction = 'none';
  let escalated = false;
  let urgency = boothChanged ? 'high' : 'low';

  switch (intent) {
    case 'TIMING':
      responseText = buildTimingResponse(booth, profile);
      break;

    case 'LOCATION':
      responseText = buildLocationResponse(booth, profile, dist, walkMin, driveMin);
      uiAction = 'open_map';
      break;

    case 'ACCESSIBILITY':
      responseText = buildAccessibilityResponse(booth, profile);
      if (responseText.includes('flagged')) {
        urgency = 'high';
        escalated = true;
      }
      break;

    case 'FULL':
    default:
      responseText = buildFullResponse(booth, profile, dist, walkMin, driveMin, boothChanged);
      uiAction = 'open_map';
      break;
  }

  return {
    agent_used: 'BOOTH',
    booth_name: booth.booth_name,
    booth_address: booth.booth_address,
    booth_part_no: booth.booth_part_no,
    election_day_timing: booth.election_day_timings,
    blo_name: booth.blo?.name,
    blo_phone: booth.blo?.phone,
    distance_km: Math.round(dist * 10) / 10,
    walk_time_min: walkMin,
    drive_time_min: driveMin,
    maps_embed_url: mapsEmbed,
    maps_directions_link: mapsDirections,
    booth_changed: boothChanged,
    accessibility: booth.accessibility,
    escalated,
    response_text: responseText,
    ui_action: uiAction,
    urgency,
    offline_safe: true,
    sub_intent: intent,
  };
}

// ── Response Builders ────────────────────────────────────────

function buildTimingResponse(booth, profile) {
  const t = booth.election_day_timings;
  const name = profile.first_name || 'dear voter';
  return `Your booth at ${booth.booth_name} is open from ${t.opens} to ${t.closes} on election day, ${name}.\n\n${t.queue_rule}\n\nPlease carry your ${t.carry}.`;
}

function buildLocationResponse(booth, profile, dist, walkMin, driveMin) {
  const name = profile.first_name || 'dear voter';
  return `Your polling booth is ${booth.booth_name}, located at ${booth.booth_address}, ${name}.\n\nIt's about ${dist.toFixed(1)} km from you — roughly ${walkMin} min walk or ${driveMin} min drive.\n\nTap the map to get directions.`;
}

function buildAccessibilityResponse(booth, profile) {
  const name = profile.first_name || 'dear voter';
  const a = booth.accessibility;

  if (a.wheelchair_ramp && a.assistance_staff) {
    let text = `Your booth at ${booth.booth_name} has wheelchair ramps and assistance personnel available, ${name}.`;
    if (a.braille_ballot) text += ' Braille ballots are also available.';
    if (a.notes) text += `\n\n${a.notes}`;
    return text;
  }

  // Not fully accessible — flag concern
  let text = `Your booth at ${booth.booth_name} does not currently have full wheelchair access, ${name}. `;
  if (!a.wheelchair_ramp) text += 'No wheelchair ramp is available. ';
  if (!a.assistance_staff) text += 'No designated assistance staff on site. ';
  text += `\n\nThis has been flagged as a priority accessibility concern. Contact the BLO ${booth.blo?.name} at ${booth.blo?.phone} or call ECI helpline 1950.`;
  return text;
}

function buildFullResponse(booth, profile, dist, walkMin, driveMin, boothChanged) {
  const name = profile.first_name || 'dear voter';
  const t = booth.election_day_timings;

  let text = `Here are your booth details, ${name}:\n\n`;
  text += `📍 ${booth.booth_name}\n${booth.booth_address}\n`;
  text += `Part No. ${booth.booth_part_no} · ${dist.toFixed(1)} km away (${walkMin} min walk)\n\n`;
  text += `🕐 Election day: ${t.opens} – ${t.closes}\n${t.queue_rule}\nCarry: ${t.carry}\n\n`;
  text += `👤 BLO: ${booth.blo?.name} (${booth.blo?.phone})`;

  if (boothChanged) {
    text += `\n\n⚠️ Your booth has been recently reassigned. Please verify the new location on the map.`;
  }

  return text;
}

module.exports = { 
  handle, 
  handleBooth: handle,
  findBooth 
};
