/**
 * Booth Agent — Handles polling booth location, distance, and change detection
 * Integrates with Google Maps Embed, Distance Matrix, and Directions APIs.
 */

const config = require('../config');
const booths = require('../data/boothData.json');

/**
 * Generate Google Maps embed URL for a booth
 */
function getMapEmbedUrl(booth) {
  const apiKey = config.google.mapsApiKey;
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${booth.lat},${booth.lng}&zoom=16`;
  }
  // Fallback: static map link (works without API key)
  return `https://maps.google.com/maps?q=${booth.lat},${booth.lng}&z=16&output=embed`;
}

/**
 * Generate Google Maps directions deep link
 */
function getDirectionsLink(booth, userLat, userLng) {
  if (userLat && userLng) {
    return `https://www.google.com/maps/dir/${userLat},${userLng}/${booth.lat},${booth.lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${booth.lat},${booth.lng}`;
}

/**
 * Compute estimated distance and time (local calculation fallback)
 * Uses Haversine formula when Google Distance Matrix is unavailable
 */
function computeLocalDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return {
    distance_km: Math.round(distance * 10) / 10,
    walk_time_min: Math.round(distance / 5 * 60),   // ~5 km/h walking
    drive_time_min: Math.round(distance / 30 * 60),  // ~30 km/h urban driving
  };
}

/**
 * Call Google Maps Distance Matrix API (when API key available)
 */
async function computeGoogleDistance(originLat, originLng, destLat, destLng) {
  if (!config.features.mapsEnabled) {
    return null; // Fall back to local computation
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=walking&key=${config.google.mapsApiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      return {
        distance_km: Math.round(element.distance.value / 100) / 10,
        walk_time_min: Math.round(element.duration.value / 60),
        drive_time_min: Math.round(element.duration.value / 60 * 0.3), // Rough driving estimate
        source: 'google_maps',
      };
    }
  } catch (err) {
    console.warn('Google Distance Matrix API unavailable, using local fallback:', err.message);
  }
  return null;
}

/**
 * Handle a booth query
 */
async function handle(message, userProfile) {
  const lowerMsg = message.toLowerCase();
  const profile = userProfile || {};

  // Find booth by user's booth_id
  const boothId = profile.booth_id || 'TN_KRI_42';
  const booth = booths.find(b => b.booth_id === boothId) || booths[0];

  // Default user location (use registered address coords as fallback)
  const userLat = profile.lat || 12.7350;
  const userLng = profile.lng || 77.8200;

  // Compute distance (try Google first, then local)
  let distanceData = await computeGoogleDistance(userLat, userLng, booth.lat, booth.lng);
  if (!distanceData) {
    distanceData = computeLocalDistance(userLat, userLng, booth.lat, booth.lng);
    distanceData.source = 'local_haversine';
  }

  const mapsEmbedUrl = getMapEmbedUrl(booth);
  const directionsLink = getDirectionsLink(booth, userLat, userLng);

  // Generate contextual response
  let responseText = '';
  let urgency = 'low';
  let uiAction = 'none';

  if (lowerMsg.includes('shift') || lowerMsg.includes('moved') || lowerMsg.includes('change')) {
    if (booth.booth_changed) {
      responseText = `${profile.first_name || 'Voter'}, your polling booth has been reassigned! New booth: ${booth.booth_name}, ${booth.booth_address}. It's ${distanceData.distance_km} km away (~${distanceData.walk_time_min} min walk). I've updated your map.`;
      urgency = 'medium';
      uiAction = 'open_map';
    } else {
      responseText = `${profile.first_name || 'Voter'}, your polling booth has not changed. It's still at ${booth.booth_name}, ${distanceData.distance_km} km from you.`;
    }
  } else if (lowerMsg.includes('map') || lowerMsg.includes('direction') || lowerMsg.includes('navigate') || lowerMsg.includes('route')) {
    responseText = `Here's your route to ${booth.booth_name}. It's ${distanceData.distance_km} km away — about ${distanceData.walk_time_min} min walking or ${distanceData.drive_time_min} min driving. Opening map now.`;
    uiAction = 'open_map';
  } else if (lowerMsg.includes('accessible') || lowerMsg.includes('wheelchair') || lowerMsg.includes('ramp')) {
    if (!booth.accessible) {
      responseText = `⚠️ ${profile.first_name || 'Voter'}, ${booth.booth_name} may have accessibility limitations. Facilities: ${booth.facilities.join(', ')}. Tap here to report or request assistance. Your concern will be flagged to the BLO.`;
      urgency = 'high';
    } else {
      responseText = `${booth.booth_name} is wheelchair accessible. Available facilities: ${booth.facilities.join(', ')}. BLO ${booth.blo_name} can assist — call ${booth.blo_phone}.`;
    }
  } else if (lowerMsg.includes('blo') || lowerMsg.includes('officer')) {
    responseText = `Your Booth Level Officer is ${booth.blo_name}. Contact: ${booth.blo_phone}. They can help with booth-related queries and accessibility requests.`;
  } else {
    // General booth query
    responseText = `${profile.first_name || 'Voter'}, your polling booth is ${booth.booth_name} at ${booth.booth_address}. Part No. ${booth.booth_part_no}. Distance: ${distanceData.distance_km} km (~${distanceData.walk_time_min} min walk).`;
    if (booth.booth_changed) {
      responseText += ` ⚠️ Note: This booth was recently reassigned.`;
      urgency = 'medium';
    }
    uiAction = 'open_map';
  }

  return {
    agent_used: 'BOOTH',
    booth_name: booth.booth_name,
    booth_address: booth.booth_address,
    booth_part_no: booth.booth_part_no,
    blo_name: booth.blo_name,
    blo_phone: booth.blo_phone,
    distance_km: distanceData.distance_km,
    walk_time_min: distanceData.walk_time_min,
    drive_time_min: distanceData.drive_time_min,
    maps_embed_url: mapsEmbedUrl,
    maps_directions_link: directionsLink,
    booth_changed: booth.booth_changed,
    accessible: booth.accessible,
    facilities: booth.facilities,
    response_text: responseText,
    ui_action: uiAction,
    urgency,
    offline_safe: distanceData.source === 'local_haversine',
  };
}

module.exports = { handle };
