/**
 * @file    index.js
 * @module  Server
 * @desc    Express entry point. Defines API routes, middleware, error
 *          handlers, and health check endpoint. All chat requests are
 *          validated, sanitised, and forwarded to the Orchestrator.
 * @version 2.1.0
 * @author  VoterSaathi+ Team
 */

'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const orchestrator = require('./agents/orchestrator');
const { validateChatRequest, sanitiseMessage } = require('./utils/validate');

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────

/**
 * Helmet sets secure HTTP response headers automatically:
 * X-Content-Type-Options, X-Frame-Options, X-XSS-Protection,
 * Strict-Transport-Security, Content-Security-Policy, and more.
 */
app.use(helmet({
  contentSecurityPolicy: false, // disabled for embedded Google Maps iframes
}));

/**
 * Rate limiter for the /api/chat endpoint.
 * Prevents abuse and ensures fair access under high load.
 * 60 requests per minute per IP is generous for a chat interface.
 */
const chatLimiter = rateLimit({
  windowMs:       60 * 1000,   // 1 minute window
  max:            60,           // 60 requests per minute per IP
  standardHeaders: true,        // return RateLimit-* response headers
  legacyHeaders:  false,
  message: {
    error: 'Too many requests. Please wait a moment and try again.'
  }
});

// ─── Core Middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Health check (Cloud Run requirement) ───────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'votersaathi-edge-cloud',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    features: config.features,
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────

/**
 * POST /api/chat — Main chat endpoint
 * Receives user message and returns orchestrator response.
 * All input is validated via validate.js before reaching agent logic.
 */
app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    // Step 1: Validate
    const { valid, error } = validateChatRequest(req.body);
    if (!valid) return res.status(400).json({ error });

    // Step 2: Sanitise
    const { user_id, device_profile } = req.body;

    const input = {
      user_id,
      message: sanitiseMessage(req.body.message),
      device_profile: device_profile || {},
      timestamp: new Date().toISOString(),
    };

    // Step 3: Route through orchestrator
    const response = await orchestrator.handleMessage(input);

    res.json(response);
  } catch (error) {
    console.error('[API /api/chat] Unhandled error:', error.message);
    res.status(500).json({
      error: 'An internal error occurred. Please try again.',
      response_text: 'I apologise for the inconvenience. Something went wrong on my end. Please try your question again.',
      agent_used: 'FALLBACK',
      offline_safe: true,
    });
  }
});

/**
 * GET /api/dashboard/:userId — Get initial dashboard data
 */
app.get('/api/dashboard/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const data = orchestrator.getDashboardData(userId, req.query);
    res.json(data);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
});

/**
 * GET /api/deadlines — Get all active deadlines
 */
app.get('/api/deadlines', (req, res) => {
  try {
    const deadlineAgent = require('./agents/deadlineAgent');
    const state = req.query.state || 'Tamil Nadu';
    const deadlines = deadlineAgent.getActiveDeadlines(state);
    res.json({ deadlines });
  } catch (error) {
    console.error('Deadline error:', error);
    res.status(500).json({ error: 'Failed to load deadlines.' });
  }
});

/**
 * GET /api/alerts — Get proactive alerts
 */
app.get('/api/alerts', (req, res) => {
  try {
    const deadlineAgent = require('./agents/deadlineAgent');
    const state = req.query.state || 'Tamil Nadu';
    const alerts = deadlineAgent.getProactiveAlerts(state);
    res.json({ alerts });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: 'Failed to load alerts.' });
  }
});

// ─── Serve frontend for all other routes ─────────────────────────────────────
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── Start server ────────────────────────────────────────────────────────────
const PORT = config.port;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════╗
    ║       VoterSaathi+ — Edge-Cloud Voter Assistant     ║
    ╠══════════════════════════════════════════════════════╣
    ║  Server:    http://localhost:${PORT}                   ║
    ║  Health:    http://localhost:${PORT}/health              ║
    ║  API Chat:  POST http://localhost:${PORT}/api/chat      ║
    ║  Env:       ${config.env.padEnd(39)}║
    ║  Project:   ${config.gcp.projectId.padEnd(39)}║
    ╚══════════════════════════════════════════════════════╝
    
    Feature Flags:
      Maps:      ${config.features.mapsEnabled ? '✅ Enabled' : '⚠️  Disabled (no API key)'}
      Translate: ${config.features.translateEnabled ? '✅ Enabled' : '⚠️  Disabled (no API key)'}
      Speech:    ${config.features.speechEnabled ? '✅ Enabled' : '⚠️  Disabled (no API key)'}
      Doc AI:    ${config.features.docAiEnabled ? '✅ Enabled' : '⚠️  Disabled (no processor ID)'}
      Firestore: ${config.features.firestoreEnabled ? '✅ Enabled' : '⚠️  Disabled (no API key)'}
    `);
  });
}

module.exports = app;
