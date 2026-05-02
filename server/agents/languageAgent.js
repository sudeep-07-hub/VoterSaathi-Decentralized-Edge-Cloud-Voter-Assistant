/**
 * Language Agent — Multilingual support for 22 scheduled Indian languages
 * Integrates with Google Cloud Translation API (cloud) and AI4Bharat IndicBERT (on-device simulation).
 * Also handles Speech-to-Text and Text-to-Speech integration.
 */

const config = require('../config');

// On-device supported languages (AI4Bharat IndicBERT covers these)
const ON_DEVICE_LANGUAGES = ['hi', 'ta', 'te', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa', 'or', 'ur', 'as'];

// Cloud-only languages (Google Cloud Translation API required)
const CLOUD_LANGUAGES = ['mai', 'kok', 'mni', 'ne', 'sa', 'sat', 'sd', 'ks', 'doi', 'brx'];

// Common phrases lookup for offline translation (simulating on-device IndicBERT)
const OFFLINE_TRANSLATIONS = {
  hi: {
    'नमस्ते': 'Hello',
    'मेरा वोटर आईडी': 'My voter ID',
    'मेरा बूथ कहाँ है': 'Where is my booth',
    'डेडलाइन कब है': 'When is the deadline',
    'शिकायत': 'Complaint',
    'मेरा नाम': 'My name',
    'पता बदलें': 'Change address',
    'फॉर्म 8': 'Form 8',
    'चुनाव': 'Election',
    'मतदान केंद्र': 'Polling station',
  },
  ta: {
    'வணக்கம்': 'Hello',
    'என் வாக்காளர் அட்டை': 'My voter card',
    'என் வாக்குச்சாவடி எங்கே': 'Where is my polling booth',
    'கடைசி தேதி': 'Last date',
    'புகார்': 'Complaint',
    'என் பெயர்': 'My name',
    'முகவரி மாற்றம்': 'Address change',
    'தேர்தல்': 'Election',
  },
  kn: {
    'ನಮಸ್ಕಾರ': 'Hello',
    'ನನ್ನ ಮತದಾರರ ಗುರುತಿನ ಚೀಟಿ': 'My voter ID card',
    'ನನ್ನ ಮತಗಟ್ಟೆ ಎಲ್ಲಿದೆ': 'Where is my polling booth',
    'ಕೊನೆಯ ದಿನಾಂಕ': 'Last date',
    'ದೂರು': 'Complaint',
  },
  te: {
    'నమస్కారం': 'Hello',
    'నా ఓటరు గుర్తింపు కార్డు': 'My voter ID card',
    'నా పోలింగ్ బూత్ ఎక్కడ': 'Where is my polling booth',
    'చివరి తేదీ': 'Last date',
    'ఫిర్యాదు': 'Complaint',
  },
  bn: {
    'নমস্কার': 'Hello',
    'আমার ভোটার আইডি': 'My voter ID',
    'আমার বুথ কোথায়': 'Where is my booth',
    'শেষ তারিখ': 'Last date',
    'অভিযোগ': 'Complaint',
  },
  ml: {
    'നമസ്കാരം': 'Hello',
    'എന്റെ വോട്ടർ ഐഡി': 'My voter ID',
    'എന്റെ ബൂത്ത് എവിടെ': 'Where is my booth',
    'അവസാന തീയതി': 'Last date',
    'പരാതി': 'Complaint',
  },
};

// Greeting responses in supported languages
const GREETINGS = {
  hi: 'नमस्ते! मैं वोटरसाथी हूँ। मैं आपकी कैसे मदद कर सकता हूँ?',
  ta: 'வணக்கம்! நான் VoterSaathi. நான் உங்களுக்கு எப்படி உதவ முடியும்?',
  kn: 'ನಮಸ್ಕಾರ! ನಾನು VoterSaathi. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
  te: 'నమస్కారం! నేను VoterSaathi. నేను మీకు ఎలా సహాయం చేయగలను?',
  bn: 'নমস্কার! আমি VoterSaathi। আমি কিভাবে আপনাকে সাহায্য করতে পারি?',
  ml: 'നമസ്കാരം! ഞാൻ VoterSaathi ആണ്. എനിക്ക് നിങ്ങളെ എങ്ങനെ സഹായിക്കാനാകും?',
  mr: 'नमस्कार! मी VoterSaathi आहे. मी तुम्हाला कशी मदत करू शकतो?',
  gu: 'નમસ્તે! હું VoterSaathi છું. હું તમને કેવી રીતે મદદ કરી શકું?',
  pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ VoterSaathi ਹਾਂ। ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?',
  en: 'Namaste! I am VoterSaathi. How can I help you today?',
};

/**
 * Attempt offline translation using local phrase lookup
 */
function translateOffline(text, fromLang) {
  const phrases = OFFLINE_TRANSLATIONS[fromLang];
  if (!phrases) return null;

  // Try exact match first
  const trimmed = text.trim();
  if (phrases[trimmed]) {
    return { translated: phrases[trimmed], confidence: 0.95, method: 'exact_match' };
  }

  // Try partial match
  for (const [phrase, translation] of Object.entries(phrases)) {
    if (trimmed.includes(phrase)) {
      return { translated: translation, confidence: 0.80, method: 'partial_match' };
    }
  }

  return null;
}

/**
 * Call Google Cloud Translation API
 */
async function translateCloud(text, targetLang, sourceLang) {
  if (!config.features.translateEnabled) {
    return null;
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${config.google.translateApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        target: targetLang,
        source: sourceLang,
        format: 'text',
      }),
    });

    const data = await response.json();
    if (data.data && data.data.translations && data.data.translations[0]) {
      return {
        translated: data.data.translations[0].translatedText,
        confidence: 0.90,
        method: 'google_cloud_translation',
        detected_language: data.data.translations[0].detectedSourceLanguage,
      };
    }
  } catch (err) {
    console.warn('Google Cloud Translation API unavailable:', err.message);
  }

  return null;
}

/**
 * Get Google Cloud Speech-to-Text config for a language
 */
function getSpeechConfig(langCode) {
  const bcp47Map = {
    hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN',
    bn: 'bn-IN', mr: 'mr-IN', gu: 'gu-IN', pa: 'pa-IN', or: 'or-IN',
    ur: 'ur-IN', as: 'as-IN', en: 'en-IN',
  };

  return {
    languageCode: bcp47Map[langCode] || 'en-IN',
    model: ON_DEVICE_LANGUAGES.includes(langCode) ? 'latest_long' : 'telephony',
    service: 'google_cloud_speech_to_text',
    enabled: config.features.speechEnabled,
  };
}

/**
 * Get Google Cloud Text-to-Speech config for a language
 */
function getTTSConfig(langCode) {
  const bcp47Map = {
    hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN',
    bn: 'bn-IN', mr: 'mr-IN', gu: 'gu-IN', pa: 'pa-IN', en: 'en-IN',
  };

  return {
    languageCode: bcp47Map[langCode] || 'en-IN',
    voiceName: `${bcp47Map[langCode] || 'en-IN'}-Wavenet-A`,
    voiceType: 'WaveNet',
    fallbackVoiceType: 'Standard',
    service: 'google_cloud_text_to_speech',
    enabled: config.features.speechEnabled,
  };
}

/**
 * Handle language processing for a message
 * @param {string} message - The raw user input
 * @param {string} detectedLang - Language code detected by intent classifier
 * @param {string} detectedLangName - Human-readable language name
 * @returns {object} Language agent response
 */
async function handle(message, detectedLang, detectedLangName) {
  const isOnDevice = ON_DEVICE_LANGUAGES.includes(detectedLang);
  const isCloud = CLOUD_LANGUAGES.includes(detectedLang);

  // If English, pass through with no translation
  if (detectedLang === 'en') {
    return {
      agent_used: 'LANGUAGE',
      detected_language: 'en',
      detected_language_name: 'English',
      confidence: 1.0,
      translated_input: message,
      translated_response: null, // Will be filled by orchestrator
      on_device: true,
      voice_output_available: config.features.speechEnabled,
      voice_output_url: null,
      speech_config: getSpeechConfig('en'),
      tts_config: getTTSConfig('en'),
    };
  }

  // Try offline translation first (simulating AI4Bharat IndicBERT)
  let translation = translateOffline(message, detectedLang);

  // If offline fails or confidence is low, try Google Cloud Translation
  if (!translation || translation.confidence < 0.75) {
    const cloudTranslation = await translateCloud(message, 'en', detectedLang);
    if (cloudTranslation) {
      translation = cloudTranslation;
    }
  }

  // If all translation fails, return the original with a note
  if (!translation) {
    translation = {
      translated: message,
      confidence: 0.50,
      method: 'passthrough',
    };
  }

  return {
    agent_used: 'LANGUAGE',
    detected_language: detectedLang,
    detected_language_name: detectedLangName,
    confidence: translation.confidence,
    translated_input: translation.translated,
    translated_response: null,
    on_device: isOnDevice && translation.method !== 'google_cloud_translation',
    translation_method: translation.method,
    voice_output_available: config.features.speechEnabled,
    voice_output_url: null,
    speech_config: getSpeechConfig(detectedLang),
    tts_config: getTTSConfig(detectedLang),
    greeting: GREETINGS[detectedLang] || GREETINGS.en,
  };
}

/**
 * Translate a response back to the user's language
 */
async function translateBack(responseText, targetLang) {
  if (targetLang === 'en') return responseText;

  // Try cloud translation
  const cloudResult = await translateCloud(responseText, targetLang, 'en');
  if (cloudResult) return cloudResult.translated;

  // Fallback: return English with a language note
  return `[${targetLang.toUpperCase()}] ${responseText}`;
}

module.exports = { handle, translateBack, GREETINGS };
