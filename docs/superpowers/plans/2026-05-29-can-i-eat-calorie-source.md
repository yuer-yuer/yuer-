# Can I Eat Calorie Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "我能吃吗" calorie field optional by supporting user-entered calories, local food database matching, and AI estimation.

**Architecture:** Add a small shared browser/test helper for calorie source resolution. The existing `public/js/app.js` panel will call the helper when food name or calories change, and will use the existing AI food recognition endpoint for AI estimates. The backend analysis endpoint remains unchanged because it already expects resolved `calories_per_100g` and `amount_g`.

**Tech Stack:** Vanilla JavaScript, browser globals, Node `node:test`, existing Express API.

---

### Task 1: Calorie Source Helper

**Files:**
- Create: `public/js/can-i-eat-calorie.js`
- Create: `tests/can-i-eat-calorie.test.js`
- Modify: `public/index.html`

- [ ] Write tests for manual calories taking priority, exact local database matching, fuzzy local database matching, and unresolved foods requiring AI estimation.
- [ ] Run `node --test tests/can-i-eat-calorie.test.js` and confirm it fails because the helper does not exist.
- [ ] Implement `resolveCanIEatCalorieSource(input, foodDatabase)` and expose it through CommonJS and `window`.
- [ ] Load `/js/can-i-eat-calorie.js` before `/js/app.js`.
- [ ] Run `node --test tests/can-i-eat-calorie.test.js` and confirm it passes.

### Task 2: Panel Behavior

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`
- Modify: `public/css/style.css`

- [ ] Add helper text and an AI estimate button near the calorie field.
- [ ] Update the panel so typing a food name fills calories from `FOOD_DATABASE` when possible.
- [ ] Keep user-entered calories authoritative and show the current calorie source.
- [ ] When submitting without resolved calories, show a friendly prompt to use AI estimation or enter calories.
- [ ] Implement AI estimation by reusing the existing recognition result format and filling the first matched food into the panel.
- [ ] Run `node --check public/js/app.js`.

### Task 3: Verification

**Files:**
- Existing tests and syntax checks

- [ ] Run `node --test tests/can-i-eat-calorie.test.js tests/fat-loss-sandbox.test.js`.
- [ ] Run `node --check public/js/can-i-eat-calorie.js`.
- [ ] Run `node --check public/js/app.js`.
- [ ] Run `node --check public/sw.js`.
