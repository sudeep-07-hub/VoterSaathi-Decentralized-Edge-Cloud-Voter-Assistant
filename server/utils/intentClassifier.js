/**
 * @file    intentClassifier.js
 * @module  IntentClassifier
 * @desc    Keyword-scoring intent classifier. Maps user messages to agent
 *          domains (BOOTH | PROFILE | APPLICATION | DEADLINE | GRIEVANCE |
 *          LANGUAGE | FALLBACK) and booth sub-intents
 *          (TIMING | LOCATION | FULL | ACCESSIBILITY).
 * @version 2.1.0
 * @author  VoterSaathi+ Team
 */

'use strict';

const DOMAIN_KEYWORDS = {
  PROFILE: {
    keywords: ['voter id', 'epic', 'roll number', 'constituency', 'registration',
               'my name', 'my details', 'profile', 'serial number', 'part number',
               'registered', 'aadhaar', 'aadhar', 'photo', 'address', 'roll',
               'voter card', 'id card', 'electoral', 'my info', 'my data',
               'completion', 'incomplete', 'missing', 'verify', 'verified'],
    weight: 1.0,
  },
  BOOTH: {
    keywords: ['booth', 'polling station', 'location', 'map', 'shifted', 'moved',
               'where do i vote', 'polling place', 'distance', 'directions',
               'how far', 'nearest', 'blo', 'booth level officer', 'accessible',
               'wheelchair', 'ramp', 'navigate', 'route',
               'open', 'close', 'hours', 'time', 'timing', 'till', 'until',
               'what time', 'polling hours'],
    weight: 1.0,
  },
  APPLICATION: {
    keywords: ['form 6', 'form 7', 'form 8', 'form 8a', 'application', 'status',
               'correction', 'update', 'new registration', 'apply', 'submit',
               'form', 'delete', 'deletion', 'objection', 'transposition',
               'document', 'upload', 'rejected', 'draft', 'under review',
               'pre-fill', 'download form'],
    weight: 1.0,
  },
  DEADLINE: {
    keywords: ['deadline', 'date', 'when', 'schedule', 'last date', 'mcc',
               'model code', 'election date', 'calendar', 'reminder', 'upcoming',
               'how many days', 'time left', 'expiry', 'due', 'closes',
               'window', 'bye-election', 'by-election'],
    weight: 1.0,
  },
  GRIEVANCE: {
    keywords: ['complaint', 'wrong', 'error', 'problem', 'frustrated', 'issue',
               'help', 'report', 'harassment', 'intimidation', 'bribery',
               'not working', 'cannot', 'failed', 'stuck', 'broken',
               'unfair', 'corrupt', 'cheat', 'angry', 'terrible',
               'worst', 'useless', 'cvigil', 'escalate', 'helpline',
               'name is missing', 'name is deleted', 'wrongly deleted'],
    weight: 4.0, // High weight to overpower individual words in other domains
  },
};

// Language detection patterns (simplified but functional)
const LANGUAGE_PATTERNS = {
  ta: /[\u0B80-\u0BFF]/,   // Tamil
  te: /[\u0C00-\u0C7F]/,   // Telugu
  kn: /[\u0C80-\u0CFF]/,   // Kannada
  ml: /[\u0D00-\u0D7F]/,   // Malayalam
  bn: /[\u0980-\u09FF]/,   // Bengali
  hi: /[\u0900-\u097F]/,   // Hindi (Devanagari)
  mr: /[\u0900-\u097F]/,   // Marathi (also Devanagari)
  gu: /[\u0A80-\u0AFF]/,   // Gujarati
  pa: /[\u0A00-\u0A7F]/,   // Punjabi (Gurmukhi)
  or: /[\u0B00-\u0B7F]/,   // Odia
  ur: /[\u0600-\u06FF]/,   // Urdu (Arabic script)
  as: /[\u0980-\u09FF]/,   // Assamese (same range as Bengali)
};

/**
 * Classify the intent of a user message into one of the agent domains.
 * @param {string} message - The raw user input
 * @returns {{ domain: string, confidence: number, scores: object }}
 */
function classifyIntent(message) {
  const lowerMsg = message.toLowerCase().trim();
  const scores = {};

  for (const [domain, config] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (lowerMsg.includes(keyword)) {
        score += config.weight;
      }
    }
    scores[domain] = score;
  }

  // Find highest scoring domain
  let bestDomain = 'FALLBACK';
  let bestScore = 0;

  for (const [domain, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  // Confidence: ratio of best score to sum of all scores (normalized)
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? bestScore / totalScore : 0;

  return {
    domain: bestDomain,
    confidence: Math.round(confidence * 100) / 100,
    scores,
  };
}

/**
 * Detect the language of a message using Unicode script ranges.
 * @param {string} message
 * @returns {{ language: string, languageName: string, isIndic: boolean }}
 */
function detectLanguage(message) {
  const langNames = {
    ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam',
    bn: 'Bengali', hi: 'Hindi', mr: 'Marathi', gu: 'Gujarati',
    pa: 'Punjabi', or: 'Odia', ur: 'Urdu', as: 'Assamese',
    en: 'English',
  };

  for (const [code, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(message)) {
      return { language: code, languageName: langNames[code] || code, isIndic: true };
    }
  }

  return { language: 'en', languageName: 'English', isIndic: false };
}

/**
 * Classify booth sub-intent for D5 intelligence upgrade.
 * @param {string} message
 * @returns {string} TIMING | LOCATION | ACCESSIBILITY | FULL
 */
function classifyBoothSubIntent(message) {
  if (!message || typeof message !== 'string') return 'FULL';
  const lower = message.toLowerCase();

  const TIMING_KW = ['open', 'close', 'hours', 'time', 'when', 'till', 'until',
    'timing', 'how long', 'what time', 'opens', 'closes', 'polling hours'];
  const LOCATION_KW = ['where', 'location', 'address', 'map', 'directions',
    'shifted', 'moved', 'find', 'distance', 'how far', 'route', 'navigate'];
  const ACCESS_KW = ['wheelchair', 'accessible', 'disabled', 'ramp', 'blind',
    'visually impaired', 'assistance', 'handicap', 'sign language'];

  const timingScore = TIMING_KW.filter(k => lower.includes(k)).length;
  const locationScore = LOCATION_KW.filter(k => lower.includes(k)).length;
  const accessScore = ACCESS_KW.filter(k => lower.includes(k)).length;

  if (accessScore > 0) return 'ACCESSIBILITY';
  if (timingScore > 0 && locationScore === 0) return 'TIMING';
  if (locationScore > 0 && timingScore === 0) return 'LOCATION';
  return 'FULL';
}

module.exports = { classifyIntent, detectLanguage, classifyBoothSubIntent };
