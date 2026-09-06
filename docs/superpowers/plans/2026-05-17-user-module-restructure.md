# User Module Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate Weight and History tabs with a complete "My" tab, move user/profile/history/statistics features into bottom sheets, and enhance the dashboard with weight and reminder cards.

**Architecture:** Keep existing APIs and database tables. Recompose the static frontend: TABS becomes dashboard/food/exercise/water/me, old weight/history sections are removed from navigation but their data and functions are reused inside "My" bottom-sheet panels.

**Tech Stack:** Vanilla HTML/CSS/JS, Chart.js, existing Express APIs, existing PWA service worker.

---

### Task 1: Navigation and Dashboard

**Files:**
- Modify: `public/js/app.js`
- Modify: `public/index.html`

- [x] Change TABS to dashboard, food, exercise, water, me.
- [x] Update quick/dial action labels to use My instead of Weight/History.
- [x] Add top-right avatar button that switches to `me`.
- [x] Add dashboard weight card and weight reminder card.

### Task 2: My Tab Shell

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`

- [x] Remove old tab-weight and tab-history page flow from bottom navigation.
- [x] Add `tab-me` page with profile hero, three square buttons, history/stat buttons, settings/about/logout.
- [x] Add bottom sheet containers for today's weight, my plan, body profile, history, stats, and AI coach placeholder.

### Task 3: Data and Interactions

**Files:**
- Modify: `public/js/app.js`

- [x] Add renderMyPage and update dashboard weight card.
- [x] Reuse existing profile, plan, history, stats, notification, and weight functions.
- [x] Add bottom-sheet open/close helpers.
- [x] Add record-today-weight flow.
- [x] Make history panel show calendar and selected date records.
- [x] Make stats panel reuse `/api/stats`.

### Task 4: Charts

**Files:**
- Modify: `public/js/charts.js`

- [x] Add mini weight chart function for body profile panel if canvas exists.
- [x] Keep existing stats charts working inside bottom sheets.

### Task 5: Styling and PWA

**Files:**
- Modify: `public/css/style.css`
- Modify: `public/sw.js`

- [x] Add neo-brutal my-page, dashboard weight, bottom sheet, history cards, and stats panel styles.
- [x] Bump service worker cache.

### Task 6: Verification

**Files:**
- No source edits.

- [x] Run `node --check server.js`.
- [x] Run `node --check public/js/app.js`.
- [x] Run `node --check public/js/charts.js`.
- [x] Run `node --check public/sw.js`.
- [x] Restart service.
- [x] Verify `/`, `/sw.js`, and key APIs.
