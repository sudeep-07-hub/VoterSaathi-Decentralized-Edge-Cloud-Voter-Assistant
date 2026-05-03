/**
 * @file    validate.js
 * @module  Validate
 * @desc    Shared input validation and sanitisation utilities.
 *          Used at the API route level and inside individual agents.
 *          All validation logic lives here — never duplicated in agent files.
 * @version 2.1.0
 * @author  VoterSaathi+ Team
 */

'use strict';

/**
 * Validates the base chat request body from POST /api/chat.
 *
 * @param {Object} body - Express request body
 * @returns {{ valid: boolean, error: string|null }}
 *
 * @example
 * const { valid, error } = validateChatRequest(req.body);
 * if (!valid) return res.status(400).json({ error });
 */
function validateChatRequest(body) {
  if (!body)
    return { valid: false, error: 'Request body is missing.' };

  if (!body.message || typeof body.message !== 'string')
    return { valid: false, error: 'message must be a non-empty string.' };

  if (body.message.trim().length === 0)
    return { valid: false, error: 'message cannot be blank.' };

  if (body.message.length > 2000)
    return { valid: false, error: 'message exceeds 2000 character limit.' };

  if (!body.user_id || typeof body.user_id !== 'string')
    return { valid: false, error: 'user_id is required and must be a string.' };

  if (body.user_id.trim().length === 0)
    return { valid: false, error: 'user_id cannot be blank.' };

  return { valid: true, error: null };
}

/**
 * Validates booth agent request parameters.
 *
 * @param {Object} params
 * @param {string} params.booth_id     - Required
 * @param {string} [params.sub_intent] - Optional; validated if provided
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateBoothParams(params) {
  if (!params)
    return { valid: false, error: 'Booth params are missing.' };

  if (!params.booth_id || typeof params.booth_id !== 'string')
    return { valid: false, error: 'booth_id is required and must be a string.' };

  const VALID_SUB_INTENTS = ['TIMING', 'LOCATION', 'FULL', 'ACCESSIBILITY'];
  if (params.sub_intent && !VALID_SUB_INTENTS.includes(params.sub_intent))
    return {
      valid: false,
      error: `Invalid sub_intent "${params.sub_intent}". ` +
             `Must be one of: ${VALID_SUB_INTENTS.join(', ')}.`
    };

  return { valid: true, error: null };
}

/**
 * Validates grievance agent request parameters.
 *
 * @param {Object} params
 * @param {string} params.message - Required
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateGrievanceParams(params) {
  if (!params || !params.message)
    return { valid: false, error: 'Grievance message is required.' };

  if (typeof params.message !== 'string')
    return { valid: false, error: 'Grievance message must be a string.' };

  return { valid: true, error: null };
}

/**
 * Sanitises a raw user message string.
 * Trims whitespace, strips ASCII control characters, and collapses
 * multiple consecutive spaces into one.
 *
 * @param {string} message - Raw input from user
 * @returns {string} Sanitised string, or empty string if input is invalid
 *
 * @example
 * sanitiseMessage('  hello\x00 world  ') // => 'hello world'
 */
function sanitiseMessage(message) {
  if (typeof message !== 'string') return '';
  return message
    .trim()
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '')   // strip control characters
    .replace(/\s{2,}/g, ' ');            // collapse multiple spaces
}

/**
 * Validates that a booth_id matches expected ECI format.
 * Expected format: {STATE}_{DISTRICT}_{PART_NO}  e.g. TN_KRI_42
 *
 * @param {string} boothId
 * @returns {boolean}
 */
function isValidBoothId(boothId) {
  if (typeof boothId !== 'string') return false;
  return /^[A-Z]{2}_[A-Z]{2,6}_\d{1,4}$/.test(boothId);
}

module.exports = {
  validateChatRequest,
  validateBoothParams,
  validateGrievanceParams,
  sanitiseMessage,
  isValidBoothId
};
