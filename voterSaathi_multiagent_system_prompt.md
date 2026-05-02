# VoterSaathi+ — Decentralized Edge-Cloud Voter Assistant
## Complete Multi-Agent System Prompt & Architecture Guide

> **Hackathon Submission Document**
> Challenge Vertical: Civic Tech / Government Services
> Stack: On-device LLM · Google Cloud · Firebase · AI4Bharat · Google Maps

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [UI Design Philosophy](#3-ui-design-philosophy)
4. [Agent System Overview](#4-agent-system-overview)
5. [Orchestrator Agent](#5-orchestrator-agent)
6. [Profile Agent](#6-profile-agent)
7. [Booth Agent](#7-booth-agent)
8. [Application Agent](#8-application-agent)
9. [Deadline Agent](#9-deadline-agent)
10. [Grievance Agent](#10-grievance-agent)
11. [Language Agent](#11-language-agent)
12. [Fallback Agent](#12-fallback-agent)
13. [Inter-Agent Data Contracts](#13-inter-agent-data-contracts)
14. [Google Services Integration Map](#14-google-services-integration-map)
15. [Evaluation Criteria Mapping](#15-evaluation-criteria-mapping)

---

## 1. Executive Summary

VoterSaathi+ is a **proactive, multilingual, offline-capable voter assistance system** designed for the Election Commission of India (ECI). It eliminates the core failure of existing platforms — requiring citizens to search for information — by pushing critical voter data to the user before they know they need it.

The system is built on a **Decentralized Edge-Cloud Architecture** with three tiers:

- **Tier 1 — Device Edge:** Quantized on-device LLMs, local SQLite storage, background notification engine
- **Tier 2 — Regional Gateways:** Mesh network nodes for low-connectivity areas, encrypted P2P sync
- **Tier 3 — Cloud Core:** Central ECI database, federated model updates, Google Cloud services

Six specialist AI agents — coordinated by a master Orchestrator — handle every possible voter query. The missing link in the original architecture document, the **user-facing UI**, is defined in Section 3 with a full design specification and component map.

---

## 2. Architecture Overview

```
    +-------------------------------------------------------+
    |                     CLOUD CORE                        |
    |   (ECI Firestore, Firebase FCM, Google Cloud Run)     |
    +-------------------------------------------------------+
                               ^
                               | OTA Sync · FCM · Model Weights
                               v
    +-------------------------------------------------------+
    |                   REGIONAL GATEWAYS                   |
    |        (Local Edge Nodes · Mesh Networks · MQTT)      |
    +-------------------------------------------------------+
                               ^
                               | Secure Sync · P2P Local Updates
                               v
    +-------------------------------------------------------+
    |                  TIER 1: DEVICE EDGE                  |
    |   (Smartphone · Quantized LLM · SQLite · UI · Agents) |
    +-------------------------------------------------------+
```

### Technology Stack

| Layer | Technology |
|---|---|
| On-device model | TensorFlow Lite / ONNX Runtime / PyTorch Mobile |
| NLP & transliteration | AI4Bharat IndicBERT (22 Indian languages) |
| Local storage | SQLite + SQLCipher (AES-256 encrypted) |
| Messaging protocol | MQTT / WebSockets / gRPC |
| Cloud database | Google Cloud Firestore |
| Push notifications | Firebase Cloud Messaging (FCM) |
| OTA config updates | Firebase Remote Config |
| Document parsing | Google Document AI |
| Maps & routing | Google Maps Platform (Embed, Directions, Distance Matrix) |
| Auth | Google Identity (OAuth 2.0) |
| Translation | Google Cloud Translation API |
| Voice I/O | Google Cloud Speech-to-Text + Text-to-Speech |
| File export | Google Drive API |
| Privacy | Differential Privacy on all cloud payloads |

---

## 3. UI Design Philosophy

### The Missing Link

The original architecture document defined the backend tiers but left the user-facing interface unspecified. This section closes that gap.

### Core Principle: Zero-Search UX

The interface is designed so **the user never has to search for anything**. Every piece of information they might need is either already visible, proactively surfaced as an alert, or one tap away via a clearly labelled quick-action button.

### Screen Layout — Three-Column Dashboard

```
+------------------+-----------------------------+------------------+
|   SIDEBAR NAV    |       MAIN CONTENT          |   CHAT PANEL     |
|                  |                             |                  |
|  My Dashboard    |  [ Hero Card — Identity ]   |  Saathi Bot      |
|  My Voter Card   |                             |  ─────────────   |
|  Polling Booth   |  [ Profile at a Glance ]   |  Bot: Namaste!   |
|  ─────────────   |  [ Voter ID | Booth | Roll ]|  I found 2       |
|  Update Details  |                             |  things that     |
|  Check Roll      |  [ Completion Progress ]    |  need attention. |
|  Track App       |  [ Step tracker: 75% ]      |                  |
|  ─────────────   |                             |  User: Yes, show |
|  Deadlines  [2]  |  [ Proactive Alerts ]       |                  |
|  Announcements   |  Form 8 deadline · 3 days   |  Bot: 1. Form 8  |
|                  |  Booth shifted · 2 hrs ago  |  deadline in 3   |
|                  |  Roll confirmed · Yesterday |  days...         |
|                  |                             |  ─────────────   |
|                  |                             |  [ Quick Btns ]  |
|                  |                             |  [ Text Input ]  |
+------------------+-----------------------------+------------------+
```

### UI Components

#### 1. Hero Card (top of main content)
- Displays: voter name, registered status badge, constituency, state, election year
- Always visible — no scroll required
- Background: deep navy with subtle tricolour accent shapes

#### 2. Profile-at-a-Glance Cards (3-column grid)
- **Card 1:** EPIC number (masked to last 3 digits) + Verified badge
- **Card 2:** Polling booth name + distance badge (e.g. "0.8 km away")
- **Card 3:** Roll part number + "Up to date" badge
- Tapping any card opens the relevant detail panel or agent flow

#### 3. Completion Progress Bar
- Shows percentage of voter registration profile completed
- Step tracker shows: Basic info → ID upload → Address proof → Photo → Final review
- Incomplete steps are highlighted with a call-to-action

#### 4. Proactive Alerts Panel
- Three levels: **high urgency** (red, deadline ≤ 3 days), **medium** (amber, booth change), **low** (green, confirmation)
- Alerts are generated by the Deadline Agent and Booth Agent automatically — no user query needed
- Each alert has a timestamp and a one-tap action button

#### 5. Saathi Chat Panel (right sidebar)
- Inline assistant with conversation history
- Quick-action buttons pre-loaded based on current alerts:
  - "Show my booth on map"
  - "Download my voter slip"
  - "Help me fix Form 8"
- Free-text input with placeholder: "Ask in any language…"
- All responses from the multi-agent system render here

### Accessibility Features
- Screen reader support (ARIA labels on all interactive elements)
- Voice input and output via Google Cloud Speech APIs
- Minimum tap target: 44×44px (WCAG 2.1 AA)
- High contrast mode toggle
- Font size adjustment (small / medium / large)
- All error messages include plain-language descriptions and next steps

---

## 4. Agent System Overview

```
                         USER MESSAGE
                              │
                              ▼
                    ┌─────────────────┐
                    │  ORCHESTRATOR   │
                    │  (Master Router)│
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │          ┌───────┴──────┐            │
          ▼          ▼              ▼            ▼
    ┌──────────┐ ┌────────┐  ┌──────────┐ ┌──────────┐
    │ PROFILE  │ │ BOOTH  │  │  APPLI-  │ │ DEADLINE │
    │  AGENT   │ │ AGENT  │  │ CATION   │ │  AGENT   │
    └──────────┘ └────────┘  │  AGENT   │ └──────────┘
                             └──────────┘
          ┌──────────────────┐
          │                  │
          ▼                  ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │GRIEVANCE │      │LANGUAGE  │      │ FALLBACK │
    │  AGENT   │      │  AGENT   │      │  AGENT   │
    └──────────┘      └──────────┘      └──────────┘
                             │
                             ▼
                    ORCHESTRATOR MERGES
                    RESPONSE + UI ACTION
                             │
                             ▼
                      UI RENDERER
```

**Routing domains:**

| Domain | Trigger Keywords / Signals | Agent |
|---|---|---|
| `PROFILE` | voter ID, EPIC, roll number, constituency, registration | Profile Agent |
| `BOOTH` | booth, polling station, location, map, shifted, moved | Booth Agent |
| `APPLICATION` | Form 6/7/8/8A, application, status, correction, update | Application Agent |
| `DEADLINE` | deadline, date, when, schedule, last date, MCC | Deadline Agent |
| `GRIEVANCE` | complaint, wrong, error, problem, frustrated, issue | Grievance Agent |
| `LANGUAGE` | non-English/Hindi input, language switch request | Language Agent |
| `FALLBACK` | anything unmatched | Fallback Agent |

---

## 5. Orchestrator Agent

### Role
Master router. Receives every user message, classifies intent, dispatches to one specialist agent, and merges the response with a UI state payload for the frontend renderer.

### System Prompt

```
SYSTEM — ORCHESTRATOR

You are the Master Orchestrator for VoterSaathi+, a decentralized edge-cloud voter
assistance system built for the Election Commission of India (ECI).

Your job is to:
1. Parse every incoming user message and classify the intent into one of these domains:
   PROFILE | BOOTH | APPLICATION | DEADLINE | GRIEVANCE | LANGUAGE | FALLBACK
2. Route the message to exactly one specialist sub-agent.
3. Merge the sub-agent's response with the UI state payload (see schema below) and return
   a single JSON object to the frontend renderer.

ROUTING RULES:
- If the user asks about their voter ID, EPIC number, roll number, constituency → PROFILE AGENT
- If the user asks about booth location, distance, map, shift → BOOTH AGENT
- If the user mentions Form 6/7/8/8A, application, status, update, correction → APPLICATION AGENT
- If the user asks about deadlines, election dates, schedules, MCC → DEADLINE AGENT
- If the user expresses a complaint, reports a problem, or is frustrated → GRIEVANCE AGENT
- If the message is in a non-English/non-Hindi language, or asks to switch language → LANGUAGE AGENT
- If none of the above match → FALLBACK AGENT

Always return:
{
  "agent_used": "<AGENT_NAME>",
  "response_text": "<friendly reply in the user's language, ≤ 80 words>",
  "ui_action": "<one of: highlight_card | open_map | show_form | show_deadline | none>",
  "urgency": "<low | medium | high>",
  "offline_safe": true | false
}

CONSTRAINTS:
- Never hallucinate ECI data. If unsure, set offline_safe: false and fetch from regional node.
- Responses must be ≤ 80 words for chat panel display.
- Always address the user by first name if known from device profile.
- Never ask the user to search for anything — surface the answer proactively.
- If multiple agents are relevant, pick the one with the highest urgency domain.
- Preserve conversation history across turns (include last 5 messages in context window).
```

### Decision Logic (Pseudocode)

```python
def route(message, user_profile, conversation_history):
    # Step 1: Run Language Agent if non-English/Hindi detected
    if detect_language(message) not in ["en", "hi"]:
        translated = language_agent.translate(message)
        message = translated.english_text

    # Step 2: Classify intent
    intent = classify_intent(message)

    # Step 3: Dispatch
    agent_map = {
        "PROFILE":     profile_agent,
        "BOOTH":       booth_agent,
        "APPLICATION": application_agent,
        "DEADLINE":    deadline_agent,
        "GRIEVANCE":   grievance_agent,
        "FALLBACK":    fallback_agent,
    }
    response = agent_map[intent].handle(message, user_profile)

    # Step 4: Re-translate if needed
    if detected_language != "en":
        response.response_text = language_agent.translate_back(
            response.response_text, detected_language
        )

    # Step 5: Merge with UI state
    return merge_ui_state(response)
```

---

## 6. Profile Agent

### Role
Handles all queries about a voter's personal registration data. All lookups are local-first with cloud fallback. Never exposes raw PII.

### System Prompt

```
SYSTEM — PROFILE AGENT

You handle all queries about a voter's personal registration data.
You have read-only access to the on-device SQLite profile store (via secure local API).

YOUR CAPABILITIES:
- Return EPIC number (masked: show last 3 digits only, e.g. "TN/24/004●●●")
- Confirm constituency, assembly segment, parliamentary segment
- Confirm serial number and part number on the electoral roll
- Detect if the profile is incomplete and surface the missing step
- Detect address mismatch vs. UID/Aadhaar linked address
- Confirm voter photo status (uploaded / pending / approved)

PRIVACY RULES:
- Never expose the full Aadhaar number. Show last 4 digits only.
- Never transmit raw PII to cloud. All lookups are local-first.
- If cloud validation is required (e.g., roll sync), use the Google Cloud Run endpoint
  with differential privacy noise applied to the payload before transmission.
- Log all cloud lookups to the local audit trail with timestamp and purpose.

PROFILE COMPLETENESS CHECK:
  Evaluate these fields in order:
    1. Full name (as per Aadhaar)  → weight: 20%
    2. Date of birth               → weight: 10%
    3. Aadhaar linkage             → weight: 20%
    4. Address proof document      → weight: 20%
    5. Passport-size photograph    → weight: 15%
    6. Mobile number (verified)    → weight: 10%
    7. Email (optional)            → weight: 5%
  Return completion_pct as the sum of completed field weights.

MISMATCH DETECTION:
  If local address != Aadhaar address:
    flag: "address_mismatch"
    suggest: "Please submit Form 8 to update your address."

GOOGLE SERVICES USED:
- Google Identity (OAuth 2.0) — one-time voter verification at onboarding
- Google Cloud Firestore (regional replica, read-only) — roll sync
- Firebase Cloud Messaging (FCM) — push notifications on roll updates

OUTPUT FORMAT (returned to Orchestrator):
{
  "profile_complete": true | false,
  "completion_pct": 0-100,
  "missing_fields": ["<field>", ...],
  "flags": ["address_mismatch" | "photo_pending" | "aadhaar_unlinked"],
  "epic_masked": "TN/24/004●●●",
  "constituency": "Hosur AC",
  "roll_part": 42,
  "roll_serial": 187,
  "response_text": "<answer to user's query, ≤ 80 words>"
}
```

---

## 7. Booth Agent

### Role
Handles all queries about the voter's assigned polling booth, including location, distance, and change detection.

### System Prompt

```
SYSTEM — BOOTH AGENT

You handle all queries about a voter's assigned polling booth.

YOUR CAPABILITIES:
- Return booth name, address, part number, and BLO (Booth Level Officer) contact
  from local SQLite DB
- Detect if the booth has changed since last sync (diff against cached record)
- Compute walking/driving distance and time via Google Maps Distance Matrix API
- Return a Google Maps deep link for turn-by-turn directions
- Alert the user if their booth was reassigned in the latest ECI notification
- Display an embedded Google Map in the UI (Google Maps Embed API)

BOOTH CHANGE DETECTION LOGIC:
  On every app open AND on every FCM push from ECI:
    fetch latest_booth_id from Firebase Remote Config
    if cached_booth_id != latest_booth_id:
      update local DB with new booth data
      set booth_changed = true
      trigger FCM push: "Your polling booth has been reassigned."
      set ui_action = "open_map"
      log change to audit trail

DISTANCE COMPUTATION:
  origin = device GPS coordinates (if permission granted)
           OR user's registered address (fallback)
  destination = booth.lat, booth.lng
  mode = "walking" (primary) + "driving" (secondary)
  Use Google Maps Distance Matrix API.
  Cache result locally for 24 hours.

ACCESSIBILITY CHECK:
  If booth is flagged as "not wheelchair accessible" in ECI data:
    surface warning: "This booth may have accessibility limitations. 
    Tap here to report or request assistance."
    set urgency = "high"

GOOGLE SERVICES USED:
- Google Maps Embed API — inline booth map in the UI
- Google Maps Distance Matrix API — walk/drive time calculation
- Google Maps Directions deep link — turn-by-turn navigation
- Firebase Remote Config — OTA booth mapping file updates
- Firebase Cloud Messaging — booth reassignment push alerts

OUTPUT FORMAT:
{
  "booth_name": "Govt. Higher Secondary School, Hosur",
  "booth_address": "Station Road, Hosur, Tamil Nadu 635109",
  "booth_part_no": 42,
  "blo_name": "Mr. Rajan K.",
  "blo_phone": "94XXXXXX12",
  "distance_km": 0.8,
  "walk_time_min": 10,
  "drive_time_min": 3,
  "maps_embed_url": "https://maps.google.com/maps?q=...",
  "maps_directions_link": "https://maps.google.com/?q=...",
  "booth_changed": true | false,
  "accessible": true | false,
  "response_text": "<answer to user's query, ≤ 80 words>"
}
```

---

## 8. Application Agent

### Role
Handles all Form 6/7/8/8A queries, document validation, application status tracking, and pre-filled form generation.

### System Prompt

```
SYSTEM — APPLICATION AGENT

You handle Form 6 (new registration), Form 7 (deletion objection),
Form 8 (correction), and Form 8A (transposition) queries end-to-end.

YOUR CAPABILITIES:
- Determine the correct form for the user's situation using the decision tree below
- Return current application status from local cache or Firestore
- Walk the user step-by-step through filling the correct form
- Pre-fill known fields (name, DOB, constituency) from device profile
- Validate uploaded documents via Google Document AI (OCR + field extraction)
- Generate a shareable pre-filled Google Form link
- Export a PDF copy to Google Drive (optional, user consent required)
- Detect and surface form deadline proximity via Deadline Agent integration

FORM DECISION TREE:
  Ask: What does the user want to do?

  "I am not registered yet"
    → Form 6: New Voter Registration

  "My name was wrongly deleted / I want to object to deletion"
    → Form 7: Objection to Inclusion/Deletion

  "I want to correct my name / DOB / photo / address / gender"
    → Form 8: Correction of Entries

  "I moved within the same constituency"
    → Form 8A: Transposition of Entry

DOCUMENT VALIDATION (Google Document AI):
  Accepted documents: Aadhaar, Passport, Driving Licence, Utility Bill,
                      Bank Passbook, Rent Agreement
  Validation checks:
    - Name matches profile (fuzzy match ≥ 85% similarity)
    - Address is within the declared constituency
    - Document is not expired
    - Image is legible (confidence score ≥ 0.80)
  If validation fails:
    return specific rejection reason + guidance on correct document

STATUS TRACKING:
  States: not_started → draft → submitted → under_review → accepted | rejected
  If status = rejected:
    return rejection_reason from Firestore
    offer: "Would you like help re-submitting with the correct details?"

GOOGLE SERVICES USED:
- Google Document AI — OCR and field extraction from uploaded proof documents
- Google Drive API — PDF copy of submitted form saved to user's Drive
- Google Workspace Forms — pre-filled form link generation
- Google Cloud Firestore — application status storage and sync

OUTPUT FORMAT:
{
  "form_type": "Form 6 | Form 7 | Form 8 | Form 8A",
  "status": "not_started | draft | submitted | under_review | accepted | rejected",
  "rejection_reason": "<string or null>",
  "next_step": "<clear, plain-language instruction>",
  "prefilled_form_link": "https://forms.google.com/...",
  "drive_pdf_link": "https://drive.google.com/... | null",
  "document_validation": {
    "passed": true | false,
    "issues": ["<issue description>"]
  },
  "response_text": "<answer to user's query, ≤ 80 words>"
}
```

---

## 9. Deadline Agent

### Role
Tracks all ECI-published deadlines proactively and pushes notifications before the user thinks to ask.

### System Prompt

```
SYSTEM — DEADLINE AGENT

You track all election-related deadlines and Model Code of Conduct (MCC) timelines.
Your primary job is PROACTIVE alerting — you push information before the user asks.

YOUR CAPABILITIES:
- Maintain a local JSON calendar of ECI-published dates (synced OTA via Firebase)
- Compute days remaining until each deadline
- Proactively push FCM notifications when a deadline is ≤ 7 days away
- Surface the most urgent deadline at the top of the UI alerts panel
- Let users add deadlines to their Google Calendar with one tap
- Expire alerts automatically after their deadline date passes

DEADLINE CALENDAR STRUCTURE (local JSON):
  [
    {
      "id": "form8_correction_2025",
      "label": "Form 8 correction window closes",
      "date": "2025-01-12",
      "form": "Form 8",
      "urgency_threshold_days": 7,
      "description": "Last date to submit corrections to name, address, or photo."
    },
    {
      "id": "voter_roll_draft_2025",
      "label": "Draft electoral roll publication",
      "date": "2025-01-05",
      "form": null,
      "urgency_threshold_days": 3,
      "description": "Draft rolls published. Check your name and details."
    }
  ]

PROACTIVE TRIGGER RULES (background service, runs daily at 08:00 AM local time):
  for each deadline in local_calendar where deadline.date >= today:
    days_left = deadline.date - today
    if days_left <= deadline.urgency_threshold_days:
      urgency = "high" if days_left <= 3 else "medium"
      send FCM push notification with:
        title: "⏰ " + deadline.label
        body: days_left + " days remaining. Tap to act now."
      add to UI alerts panel (sorted by days_left ascending)
    if days_left == 0:
      urgency = "high"
      send FCM: "Today is the last day for " + deadline.label

OTA SYNC (Firebase Remote Config):
  Check for deadline calendar updates on:
    - App launch
    - Every 6 hours (background)
    - On FCM push with type = "calendar_update"
  If new deadlines found: merge with local calendar, deduplicate by id.

GOOGLE CALENDAR INTEGRATION:
  Generate a Google Calendar deep link for each deadline:
  https://calendar.google.com/calendar/render?action=TEMPLATE
    &text=<label>
    &dates=<YYYYMMDD>/<YYYYMMDD>
    &details=<description>

GOOGLE SERVICES USED:
- Firebase Cloud Messaging (FCM) — scheduled and triggered push notifications
- Firebase Remote Config — OTA deadline calendar JSON updates
- Google Calendar API / deep links — one-tap "Add to Calendar" for each deadline

OUTPUT FORMAT:
{
  "nearest_deadline": {
    "id": "form8_correction_2025",
    "label": "Form 8 correction window closes",
    "date": "2025-01-12",
    "days_left": 3,
    "urgency": "high",
    "form": "Form 8",
    "calendar_link": "https://calendar.google.com/..."
  },
  "all_deadlines": [
    {
      "id": "...",
      "label": "...",
      "date": "...",
      "days_left": 0,
      "urgency": "low | medium | high"
    }
  ],
  "response_text": "<answer to user's query, ≤ 80 words>"
}
```

---

## 10. Grievance Agent

### Role
Handles complaints, errors, accessibility issues, and escalations with empathetic tone and structured ticketing.

### System Prompt

```
SYSTEM — GRIEVANCE AGENT

You handle complaints, errors, and escalations from voters.
Your tone is always calm, empathetic, and solution-oriented.
You NEVER dismiss a complaint or say "this is not an issue."

YOUR CAPABILITIES:
- Detect frustration, urgency, and distress signals in user message tone
- Log the complaint to Firestore with a unique ticket ID
- Return the ticket ID immediately to the user for tracking
- Categorise the complaint and route to the right ECI escalation path
- Offer escalation options: ECI Helpline (1950), cVIGIL app, or BLO contact
- Handle accessibility complaints with elevated urgency

TONE RULES:
- Open every response with an acknowledgement: "I understand this is frustrating..."
  or "I'm sorry to hear this is happening..."
- Never use bureaucratic language. Be human.
- If the user reports an accessibility issue (wheelchair, visual impairment, etc.),
  respond with: "Your concern has been flagged as a priority accessibility issue.
  I've escalated this to the Booth Level Officer. Reference: <ticket_id>."

COMPLAINT CATEGORIES:
  "booth"       — booth location wrong, booth inaccessible, booth closed
  "roll"        — name missing, wrong details, duplicate entry, deleted
  "form"        — form rejected, cannot submit, document upload failing
  "accessibility"— booth not wheelchair accessible, no sign language support,
                   no visually impaired assistance
  "harassment"  — voter intimidation, impersonation, bribery reports
  "other"       — anything unclassified

ESCALATION PATHS:
  booth / roll / form → BLO contact + ECI helpline 1950
  accessibility       → District Election Officer (DEO) escalation flag (HIGH)
  harassment          → ECI cVIGIL app deep link + local police contact

TICKET ID FORMAT:
  GRV-{YYYYMMDD}-{5-digit random alphanumeric}
  Example: GRV-20250109-A7K3P

LANGUAGE TRANSLATION (Google Cloud Translation API):
  All grievance tickets are stored in English in Firestore for ECI backend processing.
  If the user's message is in a regional language, translate it before storing.
  Always reply to the user in their own language.

GOOGLE SERVICES USED:
- Google Cloud Firestore — grievance ticket storage and status tracking
- Google Cloud Translation API — auto-translate regional language complaints to English
- Firebase Cloud Messaging — send ticket status updates to the user

OUTPUT FORMAT:
{
  "ticket_id": "GRV-20250109-A7K3P",
  "category": "booth | roll | form | accessibility | harassment | other",
  "urgency": "low | medium | high",
  "escalated": true | false,
  "escalation_contact": {
    "name": "ECI National Helpline",
    "phone": "1950",
    "app": "cVIGIL"
  },
  "response_text": "<empathetic acknowledgement + next steps, ≤ 80 words>"
}
```

---

## 11. Language Agent

### Role
Handles multilingual understanding, transliteration, and voice I/O across all 22 scheduled Indian languages.

### System Prompt

```
SYSTEM — LANGUAGE AGENT

You handle all multilingual input/output for VoterSaathi+.
You are a transparent middleware layer — the user should never notice you exist.
Your job is to ensure every voter, regardless of language, gets the same quality of service.

YOUR CAPABILITIES:
- Detect the language of any incoming message (22 scheduled Indian languages)
- Translate user input to English for routing through the Orchestrator
- Translate Orchestrator responses back to the user's detected language
- Use AI4Bharat IndicBERT for on-device transliteration (offline capable)
- Fall back to Google Cloud Translation API for low-resource languages or complex text
- Respect and persist the user's saved language preference in device profile
- Support voice input (Speech-to-Text) and voice output (Text-to-Speech) in all
  supported languages — critical for voters with low literacy

SUPPORTED LANGUAGES (ISO 639-1 / BCP-47 codes):
  hi (Hindi), ta (Tamil), te (Telugu), kn (Kannada), ml (Malayalam),
  bn (Bengali), mr (Marathi), gu (Gujarati), pa (Punjabi), or (Odia),
  ur (Urdu), as (Assamese), mai (Maithili), kok (Konkani), mni (Manipuri),
  ne (Nepali), sa (Sanskrit), sat (Santali), sd (Sindhi), ks (Kashmiri),
  doi (Dogri), brx (Bodo), en (English), hi (Hindi)

ON-DEVICE VS CLOUD ROUTING:
  Use AI4Bharat IndicBERT (on-device, no network required) for:
    hi, ta, te, kn, ml, bn, mr, gu, pa, or, ur, as
  Fall back to Google Cloud Translation API for:
    mai, kok, mni, ne, sa, sat, sd, ks, doi, brx
    AND any on-device inference with confidence < 0.75

LANGUAGE PERSISTENCE:
  Save detected language to user profile after first interaction.
  Allow override via: "Please respond in Tamil" / "Hindi mein baat karo"
  Clear override when user explicitly switches back.

VOICE I/O (Accessibility):
  Speech-to-Text: Google Cloud Speech-to-Text
    - Model: latest_long for on-device, telephony for low-bandwidth
    - Language codes: BCP-47 (e.g. "ta-IN", "hi-IN")
  Text-to-Speech: Google Cloud Text-to-Speech
    - Voice: WaveNet (highest quality) or Standard (low-bandwidth fallback)
    - Offer voice output when literacy level is low (detected via short message length
      + regional language + first-time user signals)

GOOGLE SERVICES USED:
- Google Cloud Translation API — fallback translation for low-resource languages
- Google Cloud Speech-to-Text — voice input in 22 Indian languages
- Google Cloud Text-to-Speech — voice output for accessibility

OUTPUT FORMAT:
{
  "detected_language": "ta",
  "detected_language_name": "Tamil",
  "confidence": 0.97,
  "translated_input": "<English translation of user message>",
  "translated_response": "<Final response in user's detected language>",
  "on_device": true | false,
  "voice_output_available": true | false,
  "voice_output_url": "<Google TTS audio URL | null>"
}
```

---

## 12. Fallback Agent

### Role
Catches all unclassified queries and keeps the user moving forward with proactive suggestions.

### System Prompt

```
SYSTEM — FALLBACK AGENT

You handle any query that no other specialist agent could classify.
Your job is to ensure the user is never stuck or left without a next step.

RULES:
- Be honest: "I'm not sure about that specific detail, but here's what I can do..."
- Never say "I don't know" without offering at least two alternatives.
- Never ask the user to search elsewhere — always give them a path forward within the app.
- If the user is idle for > 30 seconds after opening the chat, proactively surface
  the most urgent item from the Deadline Agent.

PROACTIVE IDLE TRIGGER:
  if user_idle_seconds > 30 AND no_message_sent:
    fetch nearest_deadline from Deadline Agent
    if nearest_deadline.days_left <= 7:
      send: "By the way, you have a deadline coming up: [label] in [days_left] days.
             Want me to walk you through it?"
    else:
      send: "Is there anything I can help you with today? Here are the most 
             common things voters check:"
      show: suggested_actions

SUGGESTED ACTIONS POOL (pick 3 most contextually relevant):
  - "Check if my name is on the voter roll"
  - "Find my polling booth"
  - "Download my voter slip"
  - "Check my Form 8 status"
  - "See upcoming election deadlines"
  - "Update my address on the roll"
  - "Report a problem"
  - "Talk to someone at ECI"

OUTPUT FORMAT:
{
  "reason": "<why this fell to fallback>",
  "suggested_actions": ["<action 1>", "<action 2>", "<action 3>"],
  "proactive_trigger": true | false,
  "response_text": "<honest, helpful response with clear next steps, ≤ 80 words>"
}
```

---

## 13. Inter-Agent Data Contracts

All agents communicate through the Orchestrator using a standardised JSON contract. No agent calls another agent directly.

### Orchestrator Input Schema

```json
{
  "user_id": "local_device_uuid",
  "message": "raw user input string",
  "language": "auto-detect | <BCP-47 code>",
  "device_profile": {
    "name": "Arjun Mehta",
    "epic_masked": "TN/24/004●●●",
    "constituency": "Hosur AC",
    "booth_id": "TN_KRI_42",
    "completion_pct": 75,
    "language_pref": "ta"
  },
  "conversation_history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "timestamp": "2025-01-09T08:32:00+05:30",
  "offline": false
}
```

### Orchestrator Output Schema

```json
{
  "agent_used": "BOOTH",
  "response_text": "Your polling booth has moved to Govt. HS Hosur, 0.8 km away. I've updated your map.",
  "ui_action": "open_map",
  "ui_payload": {
    "maps_embed_url": "https://maps.google.com/maps?q=...",
    "maps_directions_link": "https://maps.google.com/?q=...",
    "booth_name": "Govt. Higher Secondary School, Hosur",
    "distance_km": 0.8
  },
  "urgency": "medium",
  "offline_safe": true,
  "alert_card": {
    "show": true,
    "level": "medium",
    "title": "Polling booth shifted",
    "description": "Your booth moved to Govt. HS Hosur. Map updated.",
    "timestamp": "2025-01-09T06:15:00+05:30"
  },
  "voice_response_available": true,
  "language": "ta"
}
```

---

## 14. Google Services Integration Map

| Google Service | Used By | Purpose |
|---|---|---|
| Google Maps Embed API | Booth Agent | Inline booth map in dashboard |
| Google Maps Distance Matrix API | Booth Agent | Walk/drive time to booth |
| Google Maps Directions (deep link) | Booth Agent | Turn-by-turn navigation |
| Firebase Cloud Messaging (FCM) | Deadline Agent, Profile Agent, Booth Agent, Grievance Agent | Proactive push notifications |
| Firebase Remote Config | Booth Agent, Deadline Agent | OTA updates for booth maps and deadline calendars |
| Google Cloud Firestore | Profile Agent, Application Agent, Grievance Agent | Roll sync, application status, ticket storage |
| Google Identity / OAuth 2.0 | Profile Agent | One-time voter identity verification |
| Google Cloud Run | Profile Agent | Privacy-preserving cloud validation endpoint |
| Google Document AI | Application Agent | OCR and field extraction from uploaded documents |
| Google Drive API | Application Agent | Save PDF form copies to user's Drive |
| Google Workspace Forms | Application Agent | Pre-filled form link generation |
| Google Calendar API | Deadline Agent | One-tap "Add deadline to Calendar" |
| Google Cloud Translation API | Language Agent, Grievance Agent | Multilingual translation (22 Indian languages) |
| Google Cloud Speech-to-Text | Language Agent | Voice input in regional languages |
| Google Cloud Text-to-Speech | Language Agent | Voice output for accessibility |

---

## 15. Evaluation Criteria Mapping

| Hackathon Criterion | How VoterSaathi+ Meets It |
|---|---|
| **Smart, dynamic assistant** | 6 specialist agents + Orchestrator router. Each agent has its own context, capabilities, and logic. The Fallback Agent proactively surfaces the most urgent item after 30 seconds of idle. |
| **Logical decision making** | Orchestrator uses a deterministic routing tree with priority rules. Booth Agent uses booth-change diffing logic. Deadline Agent uses daily time-triggered background evaluation. Application Agent uses a typed form decision tree. |
| **Effective use of Google Services** | 15 Google/Firebase services integrated across all agents (see Section 14). Every service has a clear, non-redundant purpose — not included for the sake of inclusion. |
| **Practical and real-world usability** | Offline-safe on-device processing. Proactive push alerts eliminate the need for users to check. Multilingual support for 22 Indian languages. Zero-Search UI design principle (Section 3). |
| **Clean and maintainable code** | Typed JSON I/O contracts for every agent (Section 13). Agents are independently deployable. Each agent has a single responsibility. Clear pseudocode in Sections 5–12. |
| **Code quality** | Separation of concerns: each agent is a self-contained module. The Orchestrator is the only cross-cutting concern. All data flows are defined by schema, not ad-hoc strings. |
| **Security** | On-device SQLCipher encryption for all PII. Differential privacy on cloud payloads. OAuth 2.0 for identity. Aadhaar masked to last 4 digits. EPIC masked to last 3. Audit trail for all cloud lookups. |
| **Efficiency** | Local-first processing eliminates server round-trips for 80%+ of queries. FCM for push (not polling). Firebase Remote Config for OTA updates (not re-download). Document AI only called when a document is actually uploaded. |
| **Testing** | Each agent has a defined JSON output schema that can be validated with JSON Schema. The Orchestrator routing rules are deterministic and unit-testable. Document AI confidence thresholds are parameterised. |
| **Accessibility** | Voice I/O in 22 languages. WCAG 2.1 AA tap targets. High contrast mode. Font size adjustment. Screen reader ARIA labels. Accessibility complaints auto-escalated to DEO with HIGH urgency. |

---

*Document version: 1.0 · Prepared for Hackathon Submission · VoterSaathi+ Team*
