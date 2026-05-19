# AI Coach Xiaoshou Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AI private coach "小瘦" as a dual-entry chat assistant with data-aware answers, quick prompts, local fallback, and mobile app-style neo-brutalist UI.

**Architecture:** Add a small shared coach core module for testable scene detection, quick prompts, prompt building, and fallback replies. Add one authenticated Express endpoint that gathers the user's current health data and calls Zhipu text chat when configured, otherwise returns the deterministic local coach reply. Add a frontend chat panel, localStorage history, floating draggable entry, and "我的" entry reuse.

**Tech Stack:** Node.js CommonJS, Express, SQLite, vanilla HTML/CSS/JS, localStorage, existing PWA service worker.

---

### Task 1: Testable Coach Core

**Files:**
- Create: `lib/coach-core.js`
- Create: `tests/coach-core.test.js`

- [x] Add tests for scene prompts, data query replies, emotion fallback, medical boundary, and prompt snapshot formatting.
- [x] Implement `getCoachQuickPrompts`, `buildLocalCoachReply`, `buildCoachSystemPrompt`, and `sanitizeCoachMessages`.
- [x] Verify with `node --test tests/coach-core.test.js`.

### Task 2: Backend AI Coach API

**Files:**
- Modify: `server.js`

- [x] Import coach core helpers.
- [x] Add current-user coach context query function using existing profile, food, exercise, water, weight, and check-in data.
- [x] Add `POST /api/ai/coach-chat`.
- [x] Use `ZHIPU_CHAT_MODEL || glm-4-flash` for text chat when `ZHIPU_API_KEY` is configured.
- [x] Fall back to local coach reply on missing key or provider failure.

### Task 3: Frontend Chat Experience

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`
- Modify: `public/js/ai-coach-rules.js`

- [x] Add coach script before `app.js`.
- [x] Replace AI私教 placeholder with `openAiCoachPanel()`.
- [x] Add floating Xiaoshou entry with badge, tooltip, breathing/wave animation, and pointer dragging.
- [x] Add bottom chat sheet with message list, quick prompt row, input, send button, close/backdrop behavior.
- [x] Store the latest 50 messages in localStorage.

### Task 4: Styling and PWA

**Files:**
- Modify: `public/css/style.css`
- Modify: `public/sw.js`

- [x] Add neo-brutalist chat bubbles, panel, quick chips, floating entry, drag/typing states.
- [x] Keep panel mobile-first and within the existing 430px app shell.
- [x] Bump service worker cache version.

### Task 5: Verification

**Files:**
- No source edits.

- [x] Run `node --test tests/coach-core.test.js`.
- [x] Run `node --check server.js`.
- [x] Run `node --check public/js/app.js`.
- [x] Run `node --check public/js/ai-coach-rules.js`.
- [x] Run `node --check public/sw.js`.
- [x] Restart local service on port 3000.
- [x] Verify `/`, `/js/app.js`, `/js/ai-coach-rules.js`, `/css/style.css`, `/sw.js`.
- [x] Verify authenticated API paths reject unauthenticated requests with 401.
