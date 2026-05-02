require('dotenv').config();

const config = {
  port: process.env.PORT || 8080,
  env: process.env.NODE_ENV || 'development',

  gcp: {
    projectId: process.env.GCP_PROJECT_ID || 'votersaathi-edge-cloud',
    region: process.env.GCP_REGION || 'asia-south1',
  },

  google: {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    translateApiKey: process.env.GOOGLE_TRANSLATE_API_KEY || '',
    speechApiKey: process.env.GOOGLE_SPEECH_API_KEY || '',
    docAiProcessorId: process.env.GOOGLE_DOCAI_PROCESSOR_ID || '',
    oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    oauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'votersaathi-edge-cloud',
    apiKey: process.env.FIREBASE_API_KEY || '',
  },

  // Feature flags — degrade gracefully when API keys are missing
  features: {
    mapsEnabled: !!process.env.GOOGLE_MAPS_API_KEY,
    translateEnabled: !!process.env.GOOGLE_TRANSLATE_API_KEY,
    speechEnabled: !!process.env.GOOGLE_SPEECH_API_KEY,
    docAiEnabled: !!process.env.GOOGLE_DOCAI_PROCESSOR_ID,
    firestoreEnabled: !!process.env.FIREBASE_API_KEY,
  },
};

module.exports = config;
