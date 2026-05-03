# VoterSaathi+

**Decentralized Edge-Cloud Voter Assistance System**
Built for the Election Commission of India · Google Cloud Hackathon 2026

---

## What This Is

VoterSaathi+ is a proactive, multilingual voter assistance web application that eliminates the core failure of existing government portals — making citizens search for information they urgently need.

Instead of a reactive FAQ chatbot, VoterSaathi+ is a **multi-agent AI system** where seven specialist agents work in parallel: one tracks your deadlines before you miss them, one monitors your polling booth for reassignments, one validates your documents, one speaks your language. A master Orchestrator routes every question to the right agent and returns a response in under a second — fully offline-capable for the most critical queries.

The system runs on a **three-tier decentralized architecture**: computation happens on the device first, regional mesh nodes second, and Google Cloud only when necessary. Personal data never leaves the device unless the voter explicitly initiates a sync.

---

## Live Demo

```
https://votersaathi-199627855567.asia-south1.run.app
```

Demo voter: **Arjun Mehta** · Hosur AC · Tamil Nadu · 2026 Roll

---

## The Problem It Solves

During major election cycles, the ECI's centralized platforms — Voter Helpline App, Voter Saathi Chatbot — fail under load and fail by design:

- **Reactive, not proactive.** Voters must manually check if their booth changed, if a deadline passed, if their form was rejected. Most don't. They get disenfranchised silently.
- **Server overloads on election day.** Peak concurrency brings portals down exactly when voters need them most.
- **English-first.** India has 22 scheduled languages. Most voter assistance interfaces work well in two.
- **Half-answers.** Ask a bot "till when is the polling booth open" and it gives you the address.

VoterSaathi+ fixes all four.

---

## Architecture

```
    ┌───────────────────────────────────────┐
    │           GOOGLE CLOUD CORE           │
    │  Firestore · FCM · Cloud Run · Doc AI │
    └──────────────────┬────────────────────┘
                       │ OTA Sync · FCM · Model Weights
                       ▼
    ┌───────────────────────────────────────┐
    │         REGIONAL GATEWAYS             │
    │   Edge Nodes · Mesh Networks · MQTT   │
    └──────────────────┬────────────────────┘
                       │ Secure Sync · P2P Updates
                       ▼
    ┌───────────────────────────────────────┐
    │           DEVICE EDGE                 │
    │  Browser · Agents · SQLite · Alerts   │
    └───────────────────────────────────────┘
```

### Multi-Agent System

Every user message passes through a master **Orchestrator** that classifies intent and routes to one of seven specialist agents:

| Agent | Handles |
|---|---|
| **Profile Agent** | Voter ID, EPIC details, registration completeness, Aadhaar linkage |
| **Booth Agent** | Booth location, timing, accessibility, change detection, Google Maps |
| **Application Agent** | Form 6/7/8/8A — decision tree, document validation, status tracking |
| **Deadline Agent** | ECI calendar, days-remaining, proactive FCM push, Google Calendar sync |
| **Grievance Agent** | Complaints, ticket generation, DEO escalation, accessibility fast-path |
| **Language Agent** | 22 Indian languages, AI4Bharat IndicBERT, Google Speech I/O |
| **Fallback Agent** | Unmatched queries, idle proactive nudges, contextual suggestions |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML · CSS · JavaScript (no framework) |
| Backend | Node.js · Express |
| Database | Google Cloud Firestore |
| Auth | Google Identity · OAuth 2.0 |
| Maps | Google Maps Embed API · Distance Matrix API |
| Push notifications | Firebase Cloud Messaging (FCM) |
| OTA config | Firebase Remote Config |
| Document parsing | Google Document AI |
| Translation | Google Cloud Translation API |
| Voice I/O | Google Cloud Speech-to-Text · Text-to-Speech |
| File export | Google Drive API |
| NLP (on-device) | AI4Bharat IndicBERT · TensorFlow Lite |
| Deployment | Google Cloud Run |
| Encryption | SQLCipher (AES-256, on-device profile store) |

---

## Project Structure

```
/
├── server/
│   ├── index.js                  # Express entry point
│   ├── agents/
│   │   ├── orchestrator.js       # Master intent router
│   │   ├── profileAgent.js       # Voter ID, EPIC, completeness
│   │   ├── boothAgent.js         # Booth location, timing, maps
│   │   ├── applicationAgent.js   # Form 6/7/8/8A, Document AI
│   │   ├── deadlineAgent.js      # ECI calendar, FCM alerts
│   │   ├── grievanceAgent.js     # Tickets, escalation
│   │   ├── languageAgent.js      # Multilingual, voice I/O
│   │   └── fallbackAgent.js      # Unmatched, proactive nudges
│   ├── data/
│   │   ├── sampleProfiles.json   # Demo voter profiles
│   │   ├── boothData.json        # Booth records with timings + accessibility
│   │   └── deadlineCalendar.json # ECI deadline calendar (OTA-synced)
│   └── utils/
│       └── intentClassifier.js   # Keyword scoring + sub-intent detection
├── public/
│   ├── index.html                # Three-column dashboard shell
│   ├── css/
│   │   └── styles.css            # Design system (white minimal, navy accent)
│   └── js/
│       ├── app.js                # Shell logic: sidebar, chat panel, modals
│       ├── chat.js               # Message rendering, agent routing calls
│       └── dashboard.js          # Hero card, progress tracker, alert panel
├── Dockerfile
├── .env.example
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Google Cloud project with billing enabled
- The following APIs enabled on your GCP project:
  - Maps JavaScript API
  - Maps Distance Matrix API
  - Cloud Firestore API
  - Firebase Cloud Messaging
  - Firebase Remote Config
  - Cloud Translation API
  - Cloud Speech-to-Text API
  - Cloud Text-to-Speech API
  - Document AI API
  - Cloud Run API
  - Secret Manager API

### Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-org/votersaathi-plus.git
cd votersaathi-plus

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your API keys (see Environment Variables section below)

# 4. Start the development server
npm run dev

# 5. Open in browser
# http://localhost:3000
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Google Cloud
GCP_PROJECT_ID=your-project-id
GOOGLE_MAPS_API_KEY=your-maps-api-key
GOOGLE_CLOUD_TRANSLATION_KEY=your-translation-key
DOCUMENT_AI_PROCESSOR_ID=your-processor-id
DOCUMENT_AI_LOCATION=us

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id

# Server
PORT=3000
NODE_ENV=development
```

> **Never commit `.env` to version control.** It is gitignored by default.
> For Cloud Run deployment, inject secrets via Google Secret Manager.

---

## Deployment

### Docker

```bash
# Build the image
docker build -t votersaathi-plus .

# Run locally with Docker
docker run -p 3000:3000 --env-file .env votersaathi-plus
```

### Google Cloud Run

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Build and push to Artifact Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/votersaathi-plus

# Deploy to Cloud Run
gcloud run deploy votersaathi-plus \
  --image gcr.io/YOUR_PROJECT_ID/votersaathi-plus \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 3000 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production \
  --set-secrets GOOGLE_MAPS_API_KEY=maps-api-key:latest
```

Cloud Run automatically handles:
- HTTPS termination
- Horizontal scaling under load
- Health checks (GET `/health` endpoint included)

---

## UI Overview

The interface is designed around a single principle: **the voter should never have to search for anything.**

### Three-Column Layout

```
┌──────────────────┬─────────────────────────────┬───────────────┐
│  Sidebar Nav     │  Main Dashboard             │  Saathi Bot   │
│  (collapsible)   │                             │  (resizable,  │
│                  │  Hero card                  │  collapsible) │
│  Dashboard       │  EPIC · Booth · Roll cards  │               │
│  My Voter Card   │  Progress tracker           │  Agent-labelled│
│  Polling Booth   │  Proactive alerts           │  responses    │
│  Update Details  │  Google Map                 │  Quick actions│
│  Check Roll      │                             │  Free input   │
│  Track App       │                             │               │
│  Deadlines [n]   │                             │               │
│  Announcements   │                             │               │
└──────────────────┴─────────────────────────────┴───────────────┘
```

### Key UI Behaviours

**Collapsible sidebar** — clicking ✕ collapses the sidebar. A 40px `VoterSaathi+` logo strip remains visible on the left edge at all times, with a `☰` icon to re-expand. The brand is never hidden.

**Resizable chat panel** — the Saathi Bot panel has a drag handle on its left edge. The voter can resize it between 220px and 480px. The chosen width persists across sessions via `localStorage`.

**Voter card modal** — clicking "My Voter Card" in the sidebar or "View full card →" on the EPIC card pops a full EPIC card overlay, styled exactly like the physical card, with the tricolour stripe, all fields, and a verified footer.

**Proactive alerts** — three urgency levels shown as thin left-edge coloured stripes on each alert row: red (≤ 3 days), amber (change detected), green (confirmation). No action needed from the voter to see these.

---

## Agent Intelligence

### How the Orchestrator Routes

Every message goes through a keyword-scoring intent classifier before reaching a specialist agent. The classifier detects not just domain (`BOOTH`) but sub-intent (`TIMING` vs `LOCATION` vs `FULL` vs `ACCESSIBILITY`).

Example:

| Voter says | Sub-intent | Agent returns |
|---|---|---|
| "where is my booth" | `LOCATION` | Address + Google Maps link |
| "till when is the booth open" | `TIMING` | 7:00 AM – 6:00 PM + queue rule + what to carry |
| "tell me about my booth" | `FULL` | Address + timing + BLO contact |
| "is my booth wheelchair accessible" | `ACCESSIBILITY` | Accessibility status + escalation if not |

### Universal Agent Rules

Every agent follows two rules that prevent half-answers:

1. **Answer what was asked, not what was stored.** Before composing a response, identify the voter's actual question. Return the field that answers it — not the first field in the data object.

2. **Never leave a question half-answered.** If the agent's data covers 80% of the question, answer the 80% and explicitly name what's missing: *"I don't have that detail on file. You can confirm at ECI Helpline 1950."*

---

## Privacy & Security

- All personally identifiable information (PII) is stored on-device in **SQLCipher AES-256 encrypted** SQLite.
- EPIC numbers are masked to the last 3 characters in all UI displays.
- Aadhaar numbers are masked to the last 4 digits everywhere.
- Cloud payloads have **differential privacy noise** applied before transmission — raw PII is never sent to the cloud.
- All cloud lookups are written to a local **audit trail** with timestamp and purpose.
- Google OAuth 2.0 handles identity — no passwords stored.

---

## Multilingual Support

VoterSaathi+ supports all 22 scheduled Indian languages:

Hindi · Tamil · Telugu · Kannada · Malayalam · Bengali · Marathi · Gujarati ·
Punjabi · Odia · Urdu · Assamese · Maithili · Konkani · Manipuri · Nepali ·
Sanskrit · Santali · Sindhi · Kashmiri · Dogri · Bodo

On-device inference (AI4Bharat IndicBERT, no network required) handles the 12
highest-volume languages. Google Cloud Translation API covers the remaining 10.
Voice input and output are available in all 22 via Google Cloud Speech APIs.

---

## Accessibility

- WCAG 2.1 AA compliant minimum tap targets (44×44px)
- Full screen reader support with ARIA labels on all interactive elements
- Voice input and output in all 22 supported languages
- High contrast mode toggle
- Font size adjustment (small / medium / large)
- Accessibility complaints auto-escalated to the District Election Officer
  with HIGH priority — no manual routing needed

---

## Hackathon Evaluation Map

| Criterion | Implementation |
|---|---|
| Smart dynamic assistant | 7-agent system with Orchestrator routing, sub-intent classification, idle proactive nudges |
| Logical decision making | Deterministic keyword-scoring classifier, booth sub-intent tree, deadline trigger rules, form decision tree |
| Google Services | Maps Embed · Distance Matrix · Directions · Firestore · FCM · Remote Config · Document AI · Drive · Translation · Speech-to-Text · Text-to-Speech · Calendar · Identity · Cloud Run · Secret Manager |
| Real-world usability | Offline-safe on-device processing · proactive push alerts · 22 languages · zero-search UI |
| Clean maintainable code | One file per agent · typed JSON I/O contracts · single-responsibility utilities · no framework overhead |
| Security | AES-256 on-device encryption · differential privacy · masked PII · OAuth 2.0 · audit trail |
| Accessibility | WCAG 2.1 AA · voice I/O · screen reader support · accessibility escalation fast-path |

---

## Contributing

This project was built for the PromptWars Virtual 2026. If you are forking or
extending it:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit with a clear message: `git commit -m "agent: add sub-intent for booth accessibility"`
4. Push and open a pull request

Please keep each agent's scope clean — if a change touches more than one agent,
consider whether it belongs in `orchestrator.js` or `intentClassifier.js` instead.

---

## License

MIT License — see `LICENSE` for details.

This project uses Google Maps Platform, Firebase, and Google Cloud services.
Usage is subject to [Google's Terms of Service](https://cloud.google.com/terms).
Electoral data referenced in demo profiles is fictional and for demonstration only.

---

*VoterSaathi+ v2.1 · Built with Google Cloud · Election Commission of India · 2026*
