# Contributing to VoterSaathi+

## Architecture

VoterSaathi+ is a seven-agent system coordinated by a master Orchestrator.
Each agent in `server/agents/` owns exactly one domain and one concern.
No agent calls another agent directly — all cross-agent logic lives in
`orchestrator.js` or `intentClassifier.js`.

## Adding a New Agent

1. Create `server/agents/yourAgent.js`
2. Add the `@file` header block (see any existing agent for the template)
3. Export a single `handle<AgentName>(params)` function
4. Add full JSDoc with `@param`, `@returns {YourAgentResponse}`, and `@example`
5. Add your `@typedef YourAgentResponse` to `server/utils/types.js`
6. Register the domain in the `orchestrator.js` ROUTING_MAP
7. Wire in `validateYourParams()` from `server/utils/validate.js`
8. Add tests in `tests/agents/yourAgent.test.js` (minimum 5 test cases)
9. Update the agent table in `README.md`

## File Header Template

Every `.js` file in `server/` must open with:

```javascript
/**
 * @file    <filename>.js
 * @module  <ModuleName>
 * @desc    <What this file does and which domain it owns.>
 * @version 2.1.0
 * @author  VoterSaathi+ Team
 */
```

## Running the Project

```bash
npm run dev               # start dev server with nodemon
npm test                  # run all tests with coverage report
npm run test:unit         # agent and utils tests only
npm run test:integration  # API integration tests only
npm run lint              # ESLint check
npm run lint:fix          # auto-fix ESLint issues
```

## Commit Message Format

```
<type>(<scope>): <short description>

feat(booth):      add ACCESSIBILITY sub-intent response branch
fix(booth):       return timing in TIMING sub-intent, not address
test(deadline):   add edge case for closed window detection
refactor(utils):  extract buildErrorResponse to shared utility
docs(types):      add VoterCardData typedef
chore(deps):      add eslint devDependency
```

Types:  `feat` | `fix` | `test` | `refactor` | `docs` | `chore` | `style`

Scopes: `booth` | `profile` | `application` | `deadline` | `grievance` |
        `language` | `fallback` | `orchestrator` | `utils` | `deps` | `ci`

## Privacy Rules (Non-Negotiable)

- Never log full EPIC numbers, Aadhaar numbers, or voter addresses
- EPIC: mask all but last 3 characters in all outputs
- Aadhaar: mask all but last 4 digits in all outputs
- Never transmit raw PII to cloud — apply differential privacy on all payloads
- All cloud lookups must be written to the local audit trail with timestamp

## Testing Requirements

Every pull request must:
- Pass all existing tests with `npm test`
- Not reduce coverage below the thresholds set in `package.json`
- Include at least one new test for any new behaviour added
- Include a regression test for any bug that was fixed
