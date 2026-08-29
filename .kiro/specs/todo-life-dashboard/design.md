# Design Document

## To-Do List Life Dashboard

---

## Overview

The To-Do List Life Dashboard is a single-page web application delivered as three static files:

- `index.html` — markup and structure
- `css/style.css` — layout and visual styles
- `js/app.js` — all application logic

There is no build step, no bundler, and no external runtime dependencies. All state is persisted to `localStorage`. The architecture is a simple **Module Pattern** using JavaScript IIFEs and plain objects to encapsulate each feature domain without polluting the global namespace.

---

## Architecture

### Module Structure

```
app.js
├── StorageModule       — Read/write localStorage (tasks, links, timer duration)
├── ClockModule         — Live clock and greeting display
├── TimerModule         — Pomodoro countdown logic
├── TaskModule          — To-do list CRUD, duplicate detection, sorting
├── LinkModule          — Quick links CRUD via modal
└── AppInit             — Bootstrap: wires modules, restores persisted state
```

Each module exposes a narrow public API. Modules communicate only through their own public methods and direct DOM manipulation on their own section. No global mutable state is shared between modules.

### File Layout

```
project/
├── index.html
├── css/
│   └── style.css
└── js/
    └── app.js
```

---

## Components

### 1. Greeting Panel

**Responsibility:** Display the current time, date, and contextual greeting, updated every second.

**DOM Elements:**
- `#clock` — time display (`HH:MM`)
- `#date` — date display (e.g., `Monday, July 14, 2025`)
- `#greeting` — greeting text

**Key Functions:**

```javascript
/**
 * Returns a greeting string based on the 24-hour value of the current hour.
 * @param {number} hour - Integer in [0, 23]
 * @returns {string} One of "Good Morning", "Good Afternoon", "Good Evening", "Good Night"
 */
function getGreeting(hour) {
  if (hour >= 5  && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 20) return 'Good Evening';
  return 'Good Night'; // [21–23] and [0–4]
}

/**
 * Formats a Date into "HH:MM" string.
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

/**
 * Formats a Date into "Weekday, Month Day, Year" string.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}
```

**Update loop:** `setInterval` at 1000ms. On each tick, creates a `new Date()`, calls `formatTime`, `formatDate`, and `getGreeting`, then sets `textContent` on the three DOM nodes.

---

### 2. Focus Timer

**Responsibility:** Countdown timer with configurable duration (1–120 min), start/stop/reset controls, completion notification, and localStorage persistence of the chosen duration.

**DOM Elements:**
- `#timer-display` — shows remaining time in `MM:SS`
- `#timer-start` — start/resume button
- `#timer-stop` — pause button
- `#timer-reset` — reset button
- `#timer-duration-input` — number input, `min="1"` `max="120"`

**State:**

```javascript
const timerState = {
  durationMinutes: 25,   // configured duration, persisted to localStorage
  remainingSeconds: 1500, // countdown value
  running: false,        // is the interval active?
  intervalId: null       // setInterval handle
};
```

**Key Functions:**

```javascript
/**
 * Formats integer seconds into "MM:SS".
 * @param {number} totalSeconds - Non-negative integer
 * @returns {string}
 */
function formatTimer(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/**
 * Attempts to set a new duration. Rejects values outside [1, 120].
 * @param {number} minutes
 * @returns {boolean} true if accepted, false if rejected
 */
function setDuration(minutes) {
  const n = Math.floor(Number(minutes));
  if (isNaN(n) || n < 1 || n > 120) return false;
  timerState.durationMinutes = n;
  timerState.remainingSeconds = n * 60;
  StorageModule.saveTimerDuration(n);
  renderTimerDisplay();
  return true;
}
```

**Tick logic:**

```javascript
function tick() {
  if (timerState.remainingSeconds <= 0) {
    clearInterval(timerState.intervalId);
    timerState.running = false;
    onTimerComplete();
    return;
  }
  timerState.remainingSeconds -= 1;
  renderTimerDisplay();
}
```

**Completion handling (`onTimerComplete`):**

1. Check `Notification.permission`:
   - `'granted'` → `new Notification('Focus session complete!')` 
   - otherwise → `window.alert('Focus session complete!')`
2. Reset `timerState.remainingSeconds` to `timerState.durationMinutes * 60`.
3. Re-render display.

**Permission request:** On the first Start click, if `'Notification' in window` and `Notification.permission === 'default'`, call `Notification.requestPermission()`.

**Duration input validation:** On `change`/`blur` of `#timer-duration-input`, call `setDuration(input.value)`. If rejected, restore the input to `timerState.durationMinutes`.

---

### 3. To-Do List

**Responsibility:** Full CRUD for tasks, duplicate prevention, sort, and localStorage persistence.

**DOM Elements:**
- `#task-input` — text input for new task
- `#task-add-btn` — submit button
- `#task-error` — inline error message span (hidden by default)
- `#task-list` — `<ul>` containing task items
- `#task-sort-btn` — sort control

**Data Model:**

```javascript
// Task object
{
  id: string,       // crypto.randomUUID() or Date.now().toString()
  text: string,     // original user-entered text (trimmed)
  done: boolean     // completion state
}
```

**Normalization:**

```javascript
/**
 * Normalizes task text for duplicate detection.
 * @param {string} text
 * @returns {string}
 */
function normalizeTask(text) {
  return text.trim().toLowerCase();
}
```

**Key Functions:**

```javascript
/**
 * Checks whether the normalized form of `text` already exists in tasks,
 * optionally excluding a task by id (used during edits).
 * @param {string} text
 * @param {string|null} excludeId
 * @returns {boolean}
 */
function isDuplicate(text, excludeId = null) {
  const norm = normalizeTask(text);
  return tasks.some(t => t.id !== excludeId && normalizeTask(t.text) === norm);
}

/**
 * Adds a new task. Returns false if text is empty/whitespace or duplicate.
 * @param {string} text
 * @returns {boolean}
 */
function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isDuplicate(trimmed)) return false;
  tasks.push({ id: generateId(), text: trimmed, done: false });
  persistAndRender();
  return true;
}

/**
 * Sorts tasks in-place: pending before done, then alphabetical within each group.
 */
function sortTasks() {
  tasks.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
  });
  persistAndRender();
}
```

**Rendering:** `renderTaskList()` clears `#task-list` and re-renders every task as an `<li>` containing:
- Checkbox (toggle done)
- `<span>` with task text (strikethrough when `done`)
- Edit button → inline edit mode (replaces span with input)
- Delete button

---

### 4. Quick Links

**Responsibility:** Display bookmarked URLs as clickable cards, manage via a modal dialog.

**DOM Elements:**
- `#links-panel` — container for rendered link cards
- `#links-add-btn` — opens modal in "add" mode
- `#links-modal` — `<dialog>` element
- `#link-label-input` — text input inside modal
- `#link-url-input` — text input inside modal
- `#link-modal-error` — inline validation error span
- `#link-modal-save` — submit button inside modal
- `#link-modal-cancel` — cancel/close button

**Data Model:**

```javascript
// QuickLink object
{
  id: string,
  label: string,
  url: string    // always has http:// or https:// prefix after save
}
```

**URL Normalization:**

```javascript
/**
 * Ensures URL has a valid scheme; prepends https:// if missing.
 * @param {string} url
 * @returns {string}
 */
function normalizeUrl(url) {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed;
}
```

**Modal flow:**

- **Add mode:** Opens empty modal. On save: validate (label non-empty, URL non-empty), normalize URL, push new link, persist, close modal.
- **Edit mode:** Opens modal pre-populated with existing label/URL. On save: same validation, update link in array, persist, close modal.
- Clicking Cancel or pressing Escape closes the modal without changes.

**Rendering:** Each link card contains a label, a clickable URL (opens in `target="_blank" rel="noopener noreferrer"`), an edit button, and a delete button.

---

### 5. Storage Module

**Responsibility:** Centralized localStorage read/write with JSON serialization.

**localStorage Keys:**

| Key | Value type | Description |
|-----|-----------|-------------|
| `tld_tasks` | `Task[]` | Array of task objects |
| `tld_links` | `QuickLink[]` | Array of quick link objects |
| `tld_timer_duration` | `number` | Configured timer duration in minutes |

```javascript
const StorageModule = {
  saveTasks(tasks) {
    localStorage.setItem('tld_tasks', JSON.stringify(tasks));
  },
  loadTasks() {
    return JSON.parse(localStorage.getItem('tld_tasks') || '[]');
  },
  saveLinks(links) {
    localStorage.setItem('tld_links', JSON.stringify(links));
  },
  loadLinks() {
    return JSON.parse(localStorage.getItem('tld_links') || '[]');
  },
  saveTimerDuration(minutes) {
    localStorage.setItem('tld_timer_duration', String(minutes));
  },
  loadTimerDuration() {
    const val = parseInt(localStorage.getItem('tld_timer_duration'), 10);
    return (isNaN(val) || val < 1 || val > 120) ? 25 : val;
  }
};
```

---

## Data Flow

```
User Action
    │
    ▼
DOM Event Handler (in TaskModule / LinkModule / TimerModule)
    │
    ▼
Validate Input (normalizeTask / normalizeUrl / setDuration)
    │
    ├─ Invalid → show inline error, stop
    │
    └─ Valid
           │
           ▼
       Mutate in-memory array / state
           │
           ▼
       StorageModule.save*()   ← writes JSON to localStorage
           │
           ▼
       renderTaskList() / renderLinks() / renderTimerDisplay()
           │
           ▼
       Updated DOM visible to user
```

On page load:

```
AppInit
  ├── StorageModule.loadTimerDuration() → TimerModule.init(duration)
  ├── StorageModule.loadTasks()         → TaskModule.init(tasks)
  └── StorageModule.loadLinks()         → LinkModule.init(links)
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Empty task submission | Silently ignored (no error message, per spec) |
| Whitespace-only task | Silently ignored |
| Duplicate task | Show `#task-error` with message "Task already exists" |
| Duplicate on edit | Show inline edit error "Task already exists" |
| Empty link label | Show `#link-modal-error` "Label is required" |
| Empty link URL | Show `#link-modal-error` "URL is required" |
| Timer duration out of range | Reset input to previous valid value; no error message shown |
| localStorage unavailable | Wrap in try/catch; app functions without persistence (degraded mode) |
| Notification permission denied | Fall back to `window.alert()` |

---

## Browser Compatibility

All APIs used are broadly supported in Chrome, Firefox, Edge, and Safari (latest stable):

| API | Notes |
|-----|-------|
| `localStorage` | Universal |
| `setInterval` / `clearInterval` | Universal |
| `Date.toLocaleDateString` | Universal; uses `en-US` locale explicitly |
| `Notification` API | Guarded with `'Notification' in window` check |
| `<dialog>` element | Supported in all target browsers; polyfill not needed |
| `crypto.randomUUID()` | Supported in all target browsers (HTTPS required; fallback to `Date.now().toString()` for `file://`) |
| `String.prototype.padStart` | Universal |
| `Array.prototype.sort` with `localeCompare` | Universal |

---

## Layout Structure (index.html)

```html
<body>
  <header>                    <!-- Greeting Panel: clock, date, greeting -->
  <main>
    <section id="timer">      <!-- Focus Timer -->
    <section id="tasks">      <!-- To-Do List -->
    <section id="links">      <!-- Quick Links panel + Add button -->
  </main>
  <dialog id="links-modal">   <!-- Quick Links add/edit modal -->
</body>
```

CSS uses a responsive grid layout:
- Desktop (≥768px): 3-column grid (`timer | tasks | links`)
- Mobile (<768px): single-column stack

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Time formatting produces valid HH:MM strings

*For any* `Date` object, `formatTime(date)` SHALL return a string matching the pattern `^\d{2}:\d{2}$` where the first component equals the date's hours (0-padded to 2 digits) and the second equals the date's minutes (0-padded to 2 digits).

**Validates: Requirements 1.1**

---

### Property 2: Date formatting includes all required components

*For any* `Date` object, `formatDate(date)` SHALL return a string that contains the full weekday name, the full month name, the numeric day of the month, and the four-digit year.

**Validates: Requirements 1.2**

---

### Property 3: Greeting is correct for every hour of the day

*For any* integer hour in [0, 23], `getGreeting(hour)` SHALL return exactly `"Good Morning"` for hours [5–11], `"Good Afternoon"` for hours [12–17], `"Good Evening"` for hours [18–20], and `"Good Night"` for hours [0–4] and [21–23].

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 4: Timer display formatting produces valid MM:SS strings

*For any* non-negative integer `totalSeconds` in [0, 7200], `formatTimer(totalSeconds)` SHALL return a string matching `^\d{2}:\d{2}$` where the minutes component is `Math.floor(totalSeconds / 60)` (0-padded) and the seconds component is `totalSeconds % 60` (0-padded).

**Validates: Requirements 2.2**

---

### Property 5: Valid duration updates are accepted and reflected in display

*For any* integer `d` in [1, 120], calling `setDuration(d)` SHALL return `true`, update `timerState.durationMinutes` to `d`, and update `timerState.remainingSeconds` to `d * 60`.

**Validates: Requirements 2.9**

---

### Property 6: Out-of-range duration values are rejected

*For any* value `v` that, when converted to an integer, is less than 1 or greater than 120 (or is NaN), calling `setDuration(v)` SHALL return `false` and leave `timerState.durationMinutes` unchanged.

**Validates: Requirements 2.10**

---

### Property 7: Timer duration persists across sessions

*For any* valid duration `d` in [1, 120], after `StorageModule.saveTimerDuration(d)` is called, `StorageModule.loadTimerDuration()` SHALL return `d`. When no duration has been stored, `loadTimerDuration()` SHALL return 25.

**Validates: Requirements 2.1, 5.3, 5.4**

---

### Property 8: Valid task addition is reflected in list and storage

*For any* non-empty, non-whitespace-only, non-duplicate task text `t`, calling `addTask(t)` SHALL return `true`, add exactly one task with `text === t.trim()` to the task array, and cause `StorageModule.loadTasks()` to include that task.

**Validates: Requirements 3.2, 3.3**

---

### Property 9: Duplicate task text is rejected regardless of case or surrounding whitespace

*For any* task text `t` already present in the task list, submitting any string `s` such that `s.trim().toLowerCase() === t.trim().toLowerCase()` (whether via add or edit of a different task) SHALL return `false` and leave the task array unchanged.

**Validates: Requirements 3.4, 3.9**

---

### Property 10: Whitespace-only task text is rejected

*For any* string `s` composed entirely of whitespace characters (including the empty string), calling `addTask(s)` SHALL return `false` and not add any task to the task array.

**Validates: Requirements 3.5**

---

### Property 11: Completion toggle is an involution (round-trip)

*For any* task `t` in the task list, toggling its `done` state twice SHALL return it to its original `done` value, leaving all other fields unchanged.

**Validates: Requirements 3.6, 3.7**

---

### Property 12: Task deletion removes task from list and storage

*For any* task `t` present in the task list, after `deleteTask(t.id)` is called, no task with `id === t.id` SHALL appear in the task array, and `StorageModule.loadTasks()` SHALL not contain a task with that id.

**Validates: Requirements 3.10**

---

### Property 13: Sort produces pending-first, then alphabetical-within-group order

*For any* non-empty array of tasks (with arbitrary `done` states and text values), after `sortTasks()` is called, the resulting array SHALL satisfy: all tasks with `done === false` appear before all tasks with `done === true`, and within each group the tasks are ordered by `text.localeCompare` ascending (case-insensitive).

**Validates: Requirements 3.11, 3.12**

---

### Property 14: Task list persists and restores across sessions

*For any* array of task objects saved via `StorageModule.saveTasks(tasks)`, a subsequent call to `StorageModule.loadTasks()` SHALL return an array that is structurally equal (same ids, texts, and done states).

**Validates: Requirements 3.13, 5.1**

---

### Property 15: Valid Quick Link submission saves and restores link

*For any* non-empty label `l` and non-empty URL string `u`, submitting the Quick Links Modal SHALL persist a link object with `label === l` and `url === normalizeUrl(u)` to localStorage, such that `StorageModule.loadLinks()` includes that link.

**Validates: Requirements 4.5, 4.10, 5.2**

---

### Property 16: Empty label or URL submission is rejected

*For any* modal submission where the label is empty, the URL is empty, or both are empty, the submission SHALL be rejected, `#link-modal-error` SHALL be visible, and the links array SHALL remain unchanged.

**Validates: Requirements 4.6**

---

### Property 17: URL scheme normalization prepends https:// when scheme is absent

*For any* URL string `u` that does not begin with `http://` or `https://` (case-insensitive), `normalizeUrl(u)` SHALL return a string equal to `"https://" + u.trim()`.

**Validates: Requirements 4.7**

---

### Property 18: Quick Link deletion removes link from panel and storage

*For any* quick link `l` present in the links array, after `deleteLink(l.id)` is called, no link with `id === l.id` SHALL appear in the links array, and `StorageModule.loadLinks()` SHALL not contain a link with that id.

**Validates: Requirements 4.9**
