# Implementation Plan: To-Do List Life Dashboard

## Overview

Build a single-page static web dashboard using HTML, CSS, and Vanilla JavaScript. The implementation follows a module pattern (`StorageModule`, `ClockModule`, `TimerModule`, `TaskModule`, `LinkModule`, `AppInit`) across three files: `index.html`, `css/style.css`, and `js/app.js`. Data is persisted to `localStorage`. All features are wired together in `AppInit`.

---

## Tasks

- [x] 1. Set up project structure and HTML skeleton
  - Create `index.html` with semantic layout: `<header>` (Greeting Panel), `<main>` with three `<section>` elements (`#timer`, `#tasks`, `#links`), and `<dialog id="links-modal">`
  - Create `css/style.css` with a link tag in `<head>`; create `js/app.js` with a `<script defer>` tag before `</body>`
  - Add all required DOM element IDs referenced by the design: `#clock`, `#date`, `#greeting`, `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#timer-duration-input`, `#task-input`, `#task-add-btn`, `#task-error`, `#task-list`, `#task-sort-btn`, `#links-panel`, `#links-add-btn`, `#link-label-input`, `#link-url-input`, `#link-modal-error`, `#link-modal-save`, `#link-modal-cancel`
  - _Requirements: 6.1, 6.2_

- [x] 2. Implement StorageModule
  - [x] 2.1 Write the `StorageModule` object with `saveTasks`, `loadTasks`, `saveLinks`, `loadLinks`, `saveTimerDuration`, and `loadTimerDuration` methods using the keys `tld_tasks`, `tld_links`, and `tld_timer_duration`
    - Wrap all `localStorage` calls in `try/catch`; silently degrade if unavailable
    - `loadTimerDuration()` returns `25` when no stored value or value is out of [1, 120] range
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 2.2 Write property test for `StorageModule` round-trip persistence
    - **Property 7: Timer duration persists across sessions** — after `saveTimerDuration(d)`, `loadTimerDuration()` returns `d` for all `d` in [1, 120]
    - **Property 14: Task list persists and restores across sessions** — after `saveTasks(arr)`, `loadTasks()` returns a structurally equal array
    - **Property 15: Valid Quick Link submission saves and restores link** — after `saveLinks(arr)`, `loadLinks()` includes saved link with correct id, label, url
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 3. Implement ClockModule (Greeting Panel)
  - [x] 3.1 Write `formatTime(date)`, `formatDate(date)`, and `getGreeting(hour)` pure functions
    - `formatTime`: returns `HH:MM` string
    - `formatDate`: returns weekday, month, day, year via `toLocaleDateString('en-US', ...)`
    - `getGreeting`: hour [5–11] → "Good Morning", [12–17] → "Good Afternoon", [18–20] → "Good Evening", all others → "Good Night"
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.2 Wire `ClockModule.init()` to set `#clock`, `#date`, `#greeting` using `setInterval` at 1000ms
    - On each tick, call `new Date()`, then `formatTime`, `formatDate`, `getGreeting` and set `textContent` on the three DOM nodes
    - _Requirements: 1.1, 1.2_

  - [ ]* 3.3 Write property tests for clock formatting and greeting
    - **Property 1: `formatTime` produces valid HH:MM strings** — for a generated Date at any hour/minute, result matches `^\d{2}:\d{2}$` with correct components
    - **Property 2: `formatDate` includes all required components** — weekday name, month name, day number, 4-digit year all present
    - **Property 3: `getGreeting` is correct for every hour** — for all integers [0, 23], returns the exact expected greeting per boundary rules
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

- [x] 4. Implement TimerModule
  - [x] 4.1 Write `formatTimer(totalSeconds)` and `timerState` object; implement `setDuration(minutes)` with range validation [1, 120]
    - `setDuration` returns `true` if accepted, `false` if rejected; on acceptance updates state and calls `StorageModule.saveTimerDuration`
    - _Requirements: 2.1, 2.2, 2.8, 2.9, 2.10_

  - [ ]* 4.2 Write property tests for timer formatting and duration validation
    - **Property 4: `formatTimer` produces valid MM:SS strings** — for any `totalSeconds` in [0, 7200], result matches `^\d{2}:\d{2}$` with correct components
    - **Property 5: Valid `setDuration` is accepted** — for all `d` in [1, 120], returns `true` and updates state correctly
    - **Property 6: Out-of-range `setDuration` is rejected** — for values < 1, > 120, or NaN, returns `false` and leaves state unchanged
    - **Validates: Requirements 2.2, 2.8, 2.9, 2.10**

  - [x] 4.3 Implement start, stop, reset controls and `tick()` function
    - Start: request notification permission if `Notification.permission === 'default'`, then start `setInterval(tick, 1000)`
    - Stop: `clearInterval`, set `running = false`
    - Reset: clear interval, restore `remainingSeconds = durationMinutes * 60`, re-render
    - _Requirements: 2.3, 2.4, 2.5, 2.11_

  - [x] 4.4 Implement `onTimerComplete()` — notify via Notification API or `window.alert` fallback, then auto-reset
    - Guard `Notification` with `'Notification' in window` check
    - After alert/notification, reset `remainingSeconds` and re-render display; do not auto-restart
    - _Requirements: 2.6, 2.7_

  - [x] 4.5 Wire duration input (`#timer-duration-input`) to `setDuration` on `change`/`blur`; restore input value if rejected
    - Initialize input from `StorageModule.loadTimerDuration()` on module init
    - _Requirements: 2.8, 2.9, 2.10, 5.3, 5.4_

- [x] 5. Checkpoint — Core modules working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement TaskModule
  - [x] 6.1 Write `normalizeTask(text)` and `isDuplicate(text, excludeId)` functions; implement `addTask(text)`
    - `normalizeTask`: `text.trim().toLowerCase()`
    - `isDuplicate`: checks all tasks except `excludeId` for matching normalized text
    - `addTask`: reject empty/whitespace → return `false`; reject duplicate → return `false` and show `#task-error`; otherwise push task with `id` from `crypto.randomUUID()` (fallback: `Date.now().toString()`), persist, render
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write property tests for task addition and duplicate detection
    - **Property 8: Valid task addition is reflected in list and storage** — non-empty, non-duplicate text causes `addTask` to return `true` and adds exactly one task
    - **Property 9: Duplicate text is rejected regardless of case/whitespace** — any `s` where `s.trim().toLowerCase() === existing.trim().toLowerCase()` is rejected
    - **Property 10: Whitespace-only task text is rejected** — any all-whitespace string returns `false` from `addTask`
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.9**

  - [x] 6.3 Implement completion toggle on each task item; implement `deleteTask(id)`
    - Toggle: flip `done` state, persist, re-render; apply strikethrough CSS class when `done === true`
    - Delete: remove task by id from array, persist, re-render
    - _Requirements: 3.6, 3.7, 3.10_

  - [ ]* 6.4 Write property tests for toggle and delete
    - **Property 11: Completion toggle is an involution** — toggling `done` twice returns task to original state
    - **Property 12: Task deletion removes task from list and storage** — after `deleteTask(id)`, no task with that id remains
    - **Validates: Requirements 3.6, 3.7, 3.10**

  - [x] 6.5 Implement inline edit mode for tasks
    - Edit button replaces text `<span>` with an `<input>`, showing Save/Cancel controls
    - On save: trim text, run duplicate check (excluding current task id), show inline error if duplicate, otherwise update task, persist, re-render
    - On cancel: re-render without changes
    - _Requirements: 3.8, 3.9_

  - [x] 6.6 Implement `sortTasks()` and wire `#task-sort-btn`
    - Sort in-place: `done === false` tasks before `done === true`; within each group, sort by `text.localeCompare` ascending case-insensitive
    - Persist sorted order and re-render
    - _Requirements: 3.11, 3.12_

  - [ ]* 6.7 Write property test for task sort order
    - **Property 13: Sort produces pending-first, then alphabetical-within-group order** — for any array of tasks, after `sortTasks()`, all pending precede completed, and each group is alphabetically ordered by `localeCompare`
    - **Validates: Requirements 3.11, 3.12**

  - [x] 6.8 Implement `renderTaskList()` — clear and re-render `#task-list` from the in-memory tasks array
    - Each `<li>` contains: checkbox, text span (strikethrough when done), edit button, delete button
    - Show `#task-error` only on duplicate submission; hide it otherwise
    - _Requirements: 3.2, 3.7, 3.13_

- [x] 7. Checkpoint — Task module working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement LinkModule (Quick Links)
  - [x] 8.1 Write `normalizeUrl(url)` function and `LinkModule` data array; implement `renderLinks()`
    - `normalizeUrl`: if URL does not start with `http://` or `https://` (case-insensitive), prepend `https://`
    - Each link card renders: label text, clickable URL (`target="_blank" rel="noopener noreferrer"`), edit button, delete button
    - _Requirements: 4.1, 4.2, 4.7_

  - [ ]* 8.2 Write property test for URL normalization
    - **Property 17: `normalizeUrl` prepends `https://` when scheme is absent** — for any `u` not starting with `http://` or `https://`, result equals `"https://" + u.trim()`
    - **Validates: Requirements 4.7**

  - [x] 8.3 Implement modal open/close logic for add and edit modes
    - Add mode: open `<dialog>` with empty inputs, clear any prior error
    - Edit mode: open `<dialog>` pre-populated with existing label/URL
    - Cancel button and Escape key close modal without changes
    - _Requirements: 4.3, 4.4, 4.8_

  - [x] 8.4 Implement modal save handler — validate, normalize URL, persist, close modal
    - Validate label non-empty and URL non-empty; show `#link-modal-error` on failure
    - On valid add: push new link with generated id, persist, re-render, close modal
    - On valid edit: update link in-place, persist, re-render, close modal
    - _Requirements: 4.5, 4.6_

  - [ ]* 8.5 Write property tests for Quick Links modal validation and persistence
    - **Property 15: Valid Quick Link submission saves and restores link** — valid label + URL persists to storage and appears in `loadLinks()`
    - **Property 16: Empty label or URL submission is rejected** — modal error is shown and links array is unchanged
    - **Property 18: Quick Link deletion removes link from panel and storage** — after `deleteLink(id)`, no link with that id remains
    - **Validates: Requirements 4.5, 4.6, 4.9, 4.10, 5.2**

  - [x] 8.6 Implement `deleteLink(id)` and wire delete buttons on each link card
    - Remove link by id from array, persist, re-render
    - _Requirements: 4.9_

- [x] 9. Implement CSS layout and visual styles
  - [x] 9.1 Write responsive grid layout in `css/style.css`
    - Desktop (≥768px): 3-column CSS Grid (`timer | tasks | links`) inside `<main>`
    - Mobile (<768px): single-column stack via media query
    - Style `<header>` with clock, date, greeting centered or aligned
    - _Requirements: 6.1, 6.3_

  - [x] 9.2 Style all interactive components: task items (strikethrough for done), buttons, modal dialog, link cards, timer display, error messages
    - Use only vanilla CSS; no external stylesheets or icon libraries
    - Ensure focus indicators are visible for keyboard accessibility
    - _Requirements: 3.7, 6.2, 6.3_

- [x] 10. Implement AppInit — bootstrap and wire all modules
  - [x] 10.1 Write `AppInit` to restore persisted state and initialize all modules on `DOMContentLoaded`
    - Call `StorageModule.loadTimerDuration()` → `TimerModule.init(duration)`
    - Call `StorageModule.loadTasks()` → `TaskModule.init(tasks)`
    - Call `StorageModule.loadLinks()` → `LinkModule.init(links)`
    - Call `ClockModule.init()` to start the clock interval
    - _Requirements: 2.1, 3.13, 4.10, 5.4_

- [x] 11. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests should be written as standalone test scripts (e.g., using a simple assertion harness inline in a `test/` directory) since no framework is used — pure functions are directly importable or copied for testing
- Checkpoints at tasks 5, 7, and 11 validate incremental progress
- `crypto.randomUUID()` requires HTTPS; the `Date.now().toString()` fallback covers local `file://` testing

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1", "4.1", "6.1", "8.1", "9.1", "2.2"] },
    { "id": 2, "tasks": ["3.2", "4.3", "6.8", "8.3", "9.2", "3.3", "4.2"] },
    { "id": 3, "tasks": ["4.4", "4.5", "6.3", "6.5", "6.6", "8.4", "8.6", "6.2", "8.2"] },
    { "id": 4, "tasks": ["6.4", "6.7", "8.5"] },
    { "id": 5, "tasks": ["10.1"] }
  ]
}
```
