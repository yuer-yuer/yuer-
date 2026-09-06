# C++ Engine And Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a C++ health calculation engine integrated through Node.js IPC and a mandatory first-login onboarding flow.

**Architecture:** The C++ engine is a small CLI that reads one JSON payload from stdin and writes one JSON response to stdout. `server.js` exposes `/api/calc`, persists `profiles.onboarded`, and records the first onboarding weight. The SPA checks `profile.onboarded` after loading data, shows a non-dismissible three-step overlay, then updates the profile and renders C++ calculation cards in the body profile sheet.

**Tech Stack:** Node.js, Express, better-sqlite3, vanilla JS SPA, CSS, C++17, CMake.

---

### Task 1: Calculation Engine Test Surface

**Files:**
- Create: `cpp_engine/src/calculator.h`
- Create: `cpp_engine/src/calculator.cpp`
- Create: `cpp_engine/src/main.cpp`
- Create: `cpp_engine/CMakeLists.txt`
- Create: `cpp_engine/README.md`

- [ ] Create a C++17 CLI with actions `bmr`, `tdee`, `bmi`, `met_calories`, `weight_plan`, and `macro`.
- [ ] For each action, validate required fields and return `{"success":false,"error":"..."}` instead of crashing.
- [ ] Build with CMake and verify a `tdee` JSON request returns BMR, TDEE, and activity label.

### Task 2: Node Integration And Profile Onboarding State

**Files:**
- Modify: `server.js`

- [ ] Add `const { execFile } = require('child_process');`.
- [ ] Add `profiles.onboarded INTEGER DEFAULT 0` to the migration column list.
- [ ] Add `POST /api/calc`, invoking `cpp_engine/build/Release/calc_engine.exe` on Windows and `cpp_engine/build/calc_engine` elsewhere.
- [ ] Extend `PUT /api/profile` to persist `onboarded`.
- [ ] When `onboarded` changes from `0` to `1`, insert today's starting `weight_records` row if the request contains a valid `weight`.
- [ ] Return updated profile and target calculations after profile updates.

### Task 3: Frontend Onboarding Flow

**Files:**
- Modify: `public/js/app.js`
- Modify: `public/css/style.css`

- [ ] After `loadAllData()` receives profile data, call `maybeShowOnboarding()`.
- [ ] Add a full-screen, non-dismissible onboarding overlay with three steps: base info, weight goal, activity level.
- [ ] Validate each step inline with red border and text errors.
- [ ] Submit all fields to `PUT /api/profile` with `onboarded: 1`, update `AppState.profile`, reload dashboard data, and show completion toast.

### Task 4: C++ Calculation Cards

**Files:**
- Modify: `public/js/app.js`
- Modify: `public/css/style.css`

- [ ] In `openBodyProfileSheet()`, add a calculation card container under existing profile cards.
- [ ] Render BMR, TDEE, BMI, and weight-plan values from local profile data immediately.
- [ ] Call `/api/calc` for `tdee`, `bmi`, and `weight_plan`; replace the card with engine results when available.
- [ ] Keep local values as fallback if the C++ engine is not built.

### Task 5: Verification

**Commands:**
- `node tests/coach-core.test.js`
- `cmake -S cpp_engine -B cpp_engine/build`
- `cmake --build cpp_engine/build --config Release`
- PowerShell JSON pipe into the built engine for `tdee`, `bmi`, and `weight_plan`
- `node --check server.js`
- `node --check public/js/app.js`

**Risks:**
- The app has no browser automation setup, so final UI verification is syntax-level plus code path inspection unless a dev server/browser check is added.
- `/api/calc` requires the C++ binary to be built; the frontend must tolerate engine errors.
