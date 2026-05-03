/**
 * @file    types.js
 * @module  Types
 * @desc    Shared JSDoc type definitions for all agent response contracts.
 *          No runtime exports — this file exists purely for type documentation.
 *          Import in agent files as a JSDoc-only reference.
 * @version 2.1.0
 * @author  VoterSaathi+ Team
 */

'use strict';

// ─── Base Response ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} AgentResponse
 * @property {string}  agent_used    - Agent identifier e.g. 'BOOTH', 'PROFILE'
 * @property {string}  response_text - Human-readable reply in voter's language.
 *                                     Must be <= 80 words for chat panel display.
 * @property {string}  ui_action     - Frontend action: highlight_card | open_map |
 *                                     show_form | show_deadline |
 *                                     open_voter_card_modal | none
 * @property {string}  urgency       - 'low' | 'medium' | 'high'
 * @property {boolean} offline_safe  - true if resolved from local device data
 * @property {boolean} [error]       - true only when an agent error occurred
 */

// ─── Booth Agent ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ElectionDayTiming
 * @property {string} opens      - Opening time e.g. "7:00 AM"
 * @property {string} closes     - Closing time e.g. "6:00 PM"
 * @property {string} queue_rule - Policy for voters queued at closing time
 * @property {string} carry      - Document the voter must carry
 */

/**
 * @typedef {Object} BoothAccessibility
 * @property {boolean} wheelchair_ramp  - Whether a wheelchair ramp is present
 * @property {boolean} braille_ballot   - Whether braille ballots are available
 * @property {boolean} assistance_staff - Whether assistance staff are present
 * @property {string}  [notes]          - Additional accessibility notes
 */

/**
 * @typedef {AgentResponse} BoothAgentResponse
 * @property {string}             booth_name            - Full name of the polling booth
 * @property {string}             booth_address         - Full street address
 * @property {number}             booth_part_no         - Electoral roll part number
 * @property {ElectionDayTiming}  election_day_timing   - Opening/closing time details
 * @property {string}             blo_name              - Booth Level Officer full name
 * @property {string}             blo_phone             - BLO contact phone number
 * @property {number}             distance_km           - Distance from voter address in km
 * @property {number}             walk_time_min         - Estimated walking time in minutes
 * @property {number}             drive_time_min        - Estimated driving time in minutes
 * @property {string}             maps_embed_url        - Google Maps Embed API URL
 * @property {string}             maps_directions_link  - Google Maps directions deep link
 * @property {boolean}            booth_changed         - Whether booth was recently reassigned
 * @property {BoothAccessibility} accessibility         - Booth accessibility status
 * @property {boolean}            escalated             - true if accessibility issue escalated
 */

// ─── Profile Agent ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} VoterCardData
 * @property {string}      full_name     - Voter's full name as per Aadhaar
 * @property {string}      epic_masked   - EPIC number with last 3 digits shown
 * @property {string}      dob           - Date of birth (DD MMM YYYY)
 * @property {string}      gender        - 'Male' | 'Female' | 'Other'
 * @property {string}      constituency  - Assembly constituency name
 * @property {string}      assembly_no   - Assembly segment number
 * @property {number}      part_no       - Electoral roll part number
 * @property {number}      serial_no     - Voter serial number in the roll
 * @property {string}      address       - Registered address
 * @property {string|null} photo_url     - Profile photo URL or null
 * @property {string}      state         - State name
 * @property {number}      roll_year     - Year of electoral roll
 * @property {boolean}     verified      - Whether ECI has verified the record
 */

/**
 * @typedef {AgentResponse} ProfileAgentResponse
 * @property {boolean}      profile_complete   - Whether all required fields are filled
 * @property {number}       completion_pct     - Completion percentage (0-100)
 * @property {string[]}     missing_fields     - List of incomplete field names
 * @property {string[]}     flags              - Detected flags: address_mismatch |
 *                                               photo_pending | aadhaar_unlinked
 * @property {string}       epic_masked        - Masked EPIC number
 * @property {string}       constituency       - Voter's constituency
 * @property {number}       roll_part          - Roll part number
 * @property {number}       roll_serial        - Roll serial number
 * @property {VoterCardData} [voter_card_data] - Populated only when
 *                                               ui_action = open_voter_card_modal
 */

// ─── Application Agent ──────────────────────────────────────────────────────

/**
 * @typedef {Object} DocumentValidationResult
 * @property {boolean}  passed  - Whether document passed all validation checks
 * @property {string[]} issues  - List of specific validation failure reasons
 */

/**
 * @typedef {AgentResponse} ApplicationAgentResponse
 * @property {string}                   form_type           - Form 6 | Form 7 | Form 8 | Form 8A
 * @property {string}                   status              - not_started | draft | submitted |
 *                                                            under_review | accepted | rejected
 * @property {string|null}              rejection_reason    - Reason if status is rejected
 * @property {string}                   next_step           - Plain-language voter instruction
 * @property {string}                   prefilled_form_link - Pre-filled Google Form URL
 * @property {string|null}              drive_pdf_link      - Google Drive PDF link or null
 * @property {DocumentValidationResult} document_validation - Uploaded document check result
 */

// ─── Deadline Agent ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} DeadlineItem
 * @property {string}      id            - Unique deadline identifier
 * @property {string}      label         - Human-readable deadline label
 * @property {string}      date          - ISO date string YYYY-MM-DD
 * @property {number}      days_left     - Days remaining (negative if past)
 * @property {string}      urgency       - 'low' | 'medium' | 'high'
 * @property {string|null} form          - Related ECI form name or null
 * @property {string}      calendar_link - Google Calendar deep link
 */

/**
 * @typedef {AgentResponse} DeadlineAgentResponse
 * @property {DeadlineItem}   nearest_deadline - Soonest upcoming deadline
 * @property {DeadlineItem[]} all_deadlines    - All upcoming deadlines, sorted ascending
 */

// ─── Grievance Agent ────────────────────────────────────────────────────────

/**
 * @typedef {Object} EscalationContact
 * @property {string} name   - Contact name e.g. "ECI National Helpline"
 * @property {string} phone  - Contact phone number
 * @property {string} [app]  - App name for digital escalation e.g. "cVIGIL"
 */

/**
 * @typedef {AgentResponse} GrievanceAgentResponse
 * @property {string}             ticket_id           - Unique: GRV-YYYYMMDD-XXXXX
 * @property {string}             category            - booth | roll | form |
 *                                                      accessibility | harassment | other
 * @property {boolean}            escalated           - Whether escalated to DEO or ECI
 * @property {EscalationContact}  [escalation_contact] - Contact if escalated
 */

// ─── Language Agent ─────────────────────────────────────────────────────────

/**
 * @typedef {AgentResponse} LanguageAgentResponse
 * @property {string}      detected_language      - BCP-47 code e.g. 'ta', 'hi'
 * @property {string}      detected_language_name - Human-readable e.g. 'Tamil'
 * @property {number}      confidence             - Detection confidence 0.0-1.0
 * @property {string}      translated_input       - English translation of user message
 * @property {string}      translated_response    - Response in voter's language
 * @property {boolean}     on_device              - true if resolved via IndicBERT
 * @property {boolean}     voice_output_available - Whether TTS audio is available
 * @property {string|null} voice_output_url       - Google TTS audio URL or null
 */

// ─── Fallback Agent ─────────────────────────────────────────────────────────

/**
 * @typedef {AgentResponse} FallbackAgentResponse
 * @property {string}   reason             - Why this fell through to fallback
 * @property {string[]} suggested_actions  - Exactly 3 contextually relevant actions
 * @property {boolean}  proactive_trigger  - true if triggered by user inactivity
 */

// ─── Orchestrator ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} OrchestratorInput
 * @property {string}   user_id              - Device UUID (never sent to cloud)
 * @property {string}   message              - Sanitised user message
 * @property {string}   [language]           - BCP-47 language code or 'auto'
 * @property {Object}   device_profile       - Voter profile from local SQLite store
 * @property {Object[]} conversation_history - Last 5 messages (role + content)
 * @property {string}   timestamp            - ISO timestamp of request
 * @property {boolean}  offline              - Whether device is currently offline
 */

module.exports = {};
// No runtime exports — JSDoc only.
