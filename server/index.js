/**
 * VoterSaathi+ — Express Server Entry Point
 * Decentralized Edge-Cloud Voter Assistant
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const orchestrator = require('./agents/orchestrator');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Health check (Cloud Run requirement) ───────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'votersaathi-edge-cloud',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: config.features,
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────

/**
 * POST /api/chat — Main chat endpoint
 * Receives user message and returns orchestrator response
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, user_id, device_profile } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message is required and must be a non-empty string.',
      });
    }

    if (!user_id) {
      return res.status(400).json({
        error: 'user_id is required.',
      });
    }

    const input = {
      user_id,
      message: message.trim(),
      device_profile: device_profile || {},
      timestamp: new Date().toISOString(),
    };

    const response = await orchestrator.handleMessage(input);

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
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
