# Exercise Tab Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the exercise tab from a simple form into an immersive mobile-first exercise experience with frequent exercises, category cards, timer, weekly charts, and richer records.

**Architecture:** Keep the existing Express + SQLite + static frontend architecture. Add one authenticated frequent-exercises endpoint, reuse `EXERCISE_DATABASE` on the client, and keep timer state in `AppState` so tab switching preserves active workouts.

**Tech Stack:** Node/Express, better-sqlite3, vanilla HTML/CSS/JS, Chart.js, Web Speech API, existing PWA service worker.

---

### Task 1: Backend Frequent Exercises

**Files:**
- Modify: `server.js`

- [ ] Add `loadExerciseCatalogForApi()` near the AI food catalog helpers to parse `public/js/exercise-db.js`.
- [ ] Add `GET /api/frequent-exercises` after `/api/frequent-foods`.
- [ ] Query current user's last 7 days of `exercise_records`, group by `exercise_name`, compute `frequency`, `avg_duration`, and `last_used`, sort by frequency and recency, limit 6.
- [ ] Merge catalog metadata: `met`, `icon`, `category`.
- [ ] Verify unauthenticated requests return 401.

### Task 2: Exercise Tab Markup

**Files:**
- Modify: `public/index.html`

- [ ] Replace the old select/duration exercise form with sections in this order: frequent exercises, exercise picker, timer, weekly stats, today list.
- [ ] Add containers: `frequent-exercises-container`, `exercise-category-tabs`, `exercise-card-grid`, `exercise-duration-panel`, `exercise-timer-card`, `exercise-summary-card`, `exercise-weekly-empty`, `exercise-weekly-chart`, `exercise-type-chart`.
- [ ] Keep existing custom exercise modal unchanged.

### Task 3: Exercise State And Data Loading

**Files:**
- Modify: `public/js/app.js`

- [ ] Add `frequentExercises`, `exercisePicker`, `exerciseTimer`, `voiceEnabled`, and `exerciseStats` to `AppState`.
- [ ] Add `loadFrequentExercises()` and call it in `loadAllData()` and when switching to exercise tab.
- [ ] Add `loadExerciseStats()` using `/api/stats?period=week` for exercise tab charts.

### Task 4: Exercise Picker And Direct Add

**Files:**
- Modify: `public/js/app.js`

- [ ] Render category tabs from `EXERCISE_DATABASE`.
- [ ] Render two-column exercise cards and final custom exercise card.
- [ ] Clicking a card sets selected exercise and opens the duration panel.
- [ ] Quick duration buttons set active duration.
- [ ] Direct add computes `calcExerciseCal(met, weight, duration)` and posts to `/api/exercise`.
- [ ] Refresh today exercise, frequent exercises, check-in, dashboard, recommendations, and charts after add.

### Task 5: Timer And Voice

**Files:**
- Modify: `public/js/app.js`

- [ ] Add timer start, pause/resume, cancel, end, and confirm functions.
- [ ] Implement countdown mode when duration is set and stopwatch mode otherwise.
- [ ] Update timer display and live calorie burn every second.
- [ ] Use `speechSynthesis` when available and voice is enabled.
- [ ] End flow shows a confirmation card before writing `/api/exercise`.

### Task 6: Charts And Upgraded List

**Files:**
- Modify: `public/js/charts.js`
- Modify: `public/js/app.js`

- [ ] Add `exerciseWeeklyChart` and `exerciseTypeChart` instances.
- [ ] Add `updateExerciseCharts(stats)` that renders a weekly line chart and category doughnut chart.
- [ ] Render weekly totals: kcal, minutes, count.
- [ ] Upgrade today exercise list to cards with icon, duration, progress bar, calories, and delete.

### Task 7: Styling And PWA

**Files:**
- Modify: `public/css/style.css`
- Modify: `public/sw.js`

- [ ] Add mobile-first neo-brutal exercise UI classes.
- [ ] Add timer gradient, pulse, duration panel animation, chart sizing, and list card styles.
- [ ] Bump service worker cache version.

### Task 8: Verification

**Files:**
- No source edits.

- [ ] Run `node --check server.js`.
- [ ] Run `node --check public/js/app.js`.
- [ ] Run `node --check public/js/charts.js`.
- [ ] Run `node --check public/sw.js`.
- [ ] Restart local server.
- [ ] Verify `/`, `/sw.js`, and unauthenticated `/api/frequent-exercises` response.
