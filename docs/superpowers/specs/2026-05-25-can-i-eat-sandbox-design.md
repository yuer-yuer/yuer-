# Can I Eat Sandbox Design

## Goal

Add a "我能吃吗" flow inside the food tab that helps users decide before eating. The flow supports manual food input and AI photo recognition, then returns a structured local analysis plus optional Xiaoshou-style AI copy.

## User Flow

The food tab shows a new "我能吃吗" button near the existing AI food scan card. Opening it shows a panel with food name, calories per 100g, amount, meal type, and two actions: analyze manually or scan with camera.

When the user scans food, the existing recognition endpoint returns food rows. Instead of only offering "confirm add", the recognition result also offers "我能吃吗", which sends the recognized foods into the sandbox.

The result has three sections:

- Eat plan: whether the food fits the current day's remaining calorie budget.
- Rescue plan: if it exceeds budget, show required exercise minutes for walking, jogging, and cycling.
- Swap plan: suggest amount reduction and lower-calorie alternatives.

## Architecture

Core calculation lives in `lib/fat-loss-sandbox.js`. It accepts profile, targets, today's food, today's exercise, and proposed foods, then returns deterministic JSON. This module is tested directly.

The backend adds `POST /api/ai/can-i-eat`. It validates proposed foods, builds a snapshot from the logged-in user, calls the local sandbox, then optionally asks Zhipu chat for short Xiaoshou copy. If no key exists or the call fails, the endpoint returns the local result with a local fallback message.

The frontend adds the button, panel, form, camera handoff, API call, loading state, result rendering, and a shortcut from AI recognition results.

## Error Handling

Invalid food input returns 400. Missing profile data falls back to server target defaults. AI text generation is never required for success; local analysis is always the source of truth.

## Testing

Node tests cover the calculation module: within budget, over budget, exercise rescue, alternatives, and input sanitization. Syntax checks cover server and frontend JavaScript.
