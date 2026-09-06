# Can I Eat Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the food-tab "我能吃吗" sandbox with manual input, AI photo handoff, deterministic calorie planning, and optional LLM copy.

**Architecture:** Put deterministic planning in `lib/fat-loss-sandbox.js`, expose it through `POST /api/ai/can-i-eat`, and render the interaction in the existing vanilla JS food tab. The LLM only enhances wording; it does not decide the nutrition math.

**Tech Stack:** Node.js, Express, SQLite, `node:test`, vanilla HTML/CSS/JavaScript, existing Zhipu chat configuration.

---

### Task 1: Core Sandbox Logic

**Files:**
- Create: `lib/fat-loss-sandbox.js`
- Create: `tests/fat-loss-sandbox.test.js`

- [ ] Write failing tests for within-budget, over-budget, and invalid proposed food behavior.
- [ ] Run `node --test tests/fat-loss-sandbox.test.js` and verify it fails because the module is missing.
- [ ] Implement `buildCanIEatAnalysis(input)` with calorie budget, status, exercise rescue, and swap suggestions.
- [ ] Run `node --test tests/fat-loss-sandbox.test.js` and verify it passes.

### Task 2: Backend Endpoint

**Files:**
- Modify: `server.js`
- Test: `node --check server.js`

- [ ] Import `buildCanIEatAnalysis`.
- [ ] Add a helper that asks Zhipu chat for concise Xiaoshou copy using the local analysis.
- [ ] Add `POST /api/ai/can-i-eat` after the existing AI recognition route.
- [ ] Ensure the endpoint returns local fallback copy when `AI_MOCK=1`, no API key exists, or the LLM call fails.
- [ ] Run `node --check server.js`.

### Task 3: Frontend UI And Camera Handoff

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`
- Modify: `public/css/style.css`
- Modify: `public/sw.js`

- [ ] Add the "我能吃吗" button and a bottom-sheet style modal.
- [ ] Add `AppState.canIEat` state and functions to open, close, fill from selected food, scan, submit, and render results.
- [ ] Add a "我能吃吗" action to AI recognition results so recognized foods can be analyzed before adding.
- [ ] Bump the service worker cache name because cached frontend assets changed.
- [ ] Run `node --check public/js/app.js` and `node --check public/sw.js`.

### Task 4: Full Verification

**Files:**
- Existing tests and syntax checks

- [ ] Run `node --test tests/fat-loss-sandbox.test.js tests/coach-core.test.js`.
- [ ] Run `node --check server.js`.
- [ ] Run `node --check public/js/app.js`.
- [ ] Run `node --check public/js/charts.js`.
- [ ] Run `node --check public/sw.js`.
- [ ] Start or restart the local server and report the URL.
