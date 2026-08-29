// =============================================================================
// StorageModule
// Centralised localStorage read/write with JSON serialisation.
// All methods are wrapped in try/catch so the app degrades silently when
// localStorage is unavailable (e.g. private-browsing restrictions).
// Keys: tld_tasks | tld_links | tld_timer_duration
// =============================================================================
const StorageModule = {
  /**
   * Persist the complete tasks array to localStorage.
   * @param {Array<{id: string, text: string, done: boolean}>} tasks
   */
  saveTasks(tasks) {
    try {
      localStorage.setItem('tld_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.warn('StorageModule.saveTasks: localStorage unavailable.', e);
    }
  },

  /**
   * Load the tasks array from localStorage.
   * Returns an empty array when no data is stored or on any error.
   * @returns {Array<{id: string, text: string, done: boolean}>}
   */
  loadTasks() {
    try {
      return JSON.parse(localStorage.getItem('tld_tasks') || '[]');
    } catch (e) {
      console.warn('StorageModule.loadTasks: failed to parse stored data.', e);
      return [];
    }
  },

  /**
   * Persist the complete links array to localStorage.
   * @param {Array<{id: string, label: string, url: string}>} links
   */
  saveLinks(links) {
    try {
      localStorage.setItem('tld_links', JSON.stringify(links));
    } catch (e) {
      console.warn('StorageModule.saveLinks: localStorage unavailable.', e);
    }
  },

  /**
   * Load the links array from localStorage.
   * Returns an empty array when no data is stored or on any error.
   * @returns {Array<{id: string, label: string, url: string}>}
   */
  loadLinks() {
    try {
      return JSON.parse(localStorage.getItem('tld_links') || '[]');
    } catch (e) {
      console.warn('StorageModule.loadLinks: failed to parse stored data.', e);
      return [];
    }
  },

  /**
   * Persist the configured timer duration (in minutes) to localStorage.
   * @param {number} minutes - Integer in [1, 120]
   */
  saveTimerDuration(minutes) {
    try {
      localStorage.setItem('tld_timer_duration', String(minutes));
    } catch (e) {
      console.warn('StorageModule.saveTimerDuration: localStorage unavailable.', e);
    }
  },

  /**
   * Load the timer duration from localStorage.
   * Returns 25 (the default) when no value is stored, the stored value is not a
   * valid integer, or it falls outside the allowed range [1, 120].
   * @returns {number} Integer in [1, 120]
   */
  loadTimerDuration() {
    try {
      const val = parseInt(localStorage.getItem('tld_timer_duration'), 10);
      return (isNaN(val) || val < 1 || val > 120) ? 25 : val;
    } catch (e) {
      console.warn('StorageModule.loadTimerDuration: localStorage unavailable.', e);
      return 25;
    }
  }
};

// =============================================================================
// ClockModule
// Provides pure helper functions for time/date formatting and contextual
// greeting generation. No DOM access — all functions are side-effect free.
// Used by ClockModule.init() to drive the live Greeting Panel updates.
// =============================================================================
const ClockModule = {
  /**
   * Formats a Date into a zero-padded "HH:MM" string.
   * @param {Date} date
   * @returns {string} e.g. "09:05" or "23:47"
   */
  formatTime(date) {
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  },

  /**
   * Formats a Date into a human-readable date string using the en-US locale.
   * Returns a string such as "Monday, July 14, 2025".
   * @param {Date} date
   * @returns {string}
   */
  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * Returns a contextual greeting based on the 24-hour value of the current hour.
   * - [5–11]  → "Good Morning"
   * - [12–17] → "Good Afternoon"
   * - [18–20] → "Good Evening"
   * - [0–4] and [21–23] → "Good Night"
   * @param {number} hour - Integer in [0, 23]
   * @returns {string}
   */
  getGreeting(hour) {
    if (hour >= 5  && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 20) return 'Good Evening';
    return 'Good Night';
  },

  /**
   * Starts the live clock by immediately rendering the current time/date/greeting
   * and then repeating the update every 1000ms via setInterval.
   * Updates #clock, #date, and #greeting DOM elements.
   * Requirements: 1.1, 1.2
   */
  init() {
    const tick = () => {
      const now = new Date();
      const clockEl    = document.getElementById('clock');
      const dateEl     = document.getElementById('date');
      const greetingEl = document.getElementById('greeting');

      if (clockEl)    clockEl.textContent    = this.formatTime(now);
      if (dateEl)     dateEl.textContent     = this.formatDate(now);
      if (greetingEl) greetingEl.textContent = this.getGreeting(now.getHours());
    };

    // Render immediately so the display is populated before the first tick fires
    tick();
    setInterval(tick, 1000);
  }
};

// =============================================================================
// TimerModule
// Pomodoro-style countdown timer with configurable duration, start/stop/reset
// controls, and completion notifications. Duration is persisted via
// StorageModule. All timer logic is self-contained; DOM updates are delegated
// to renderTimerDisplay().
// =============================================================================

/**
 * Formats a non-negative integer number of seconds into a "MM:SS" string.
 * Both components are zero-padded to two digits.
 * @param {number} totalSeconds - Non-negative integer, expected range [0, 7200]
 * @returns {string} e.g. "25:00", "01:05", "00:00"
 */
function formatTimer(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/**
 * Mutable state object for the Focus Timer.
 * @type {{ durationMinutes: number, remainingSeconds: number, running: boolean, intervalId: number|null }}
 */
const timerState = {
  durationMinutes: 25,    // configured session length, persisted to localStorage
  remainingSeconds: 1500, // current countdown value (durationMinutes * 60 on reset)
  running: false,         // true while the setInterval tick is active
  intervalId: null        // handle returned by setInterval; null when stopped
};

/**
 * Placeholder — updates the timer display element (#timer-display) to reflect
 * timerState.remainingSeconds. Full implementation added in task 4.3/4.5.
 */
function renderTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (el) el.textContent = formatTimer(timerState.remainingSeconds);
}

/**
 * Attempts to set a new timer duration.
 * Accepts any whole number of minutes in [1, 120]; rejects everything else.
 *
 * On acceptance:
 *   - Updates timerState.durationMinutes and timerState.remainingSeconds
 *   - Persists the new duration via StorageModule.saveTimerDuration()
 *   - Calls renderTimerDisplay() to refresh the UI immediately
 *
 * @param {*} minutes - Value to interpret as the new duration in minutes
 * @returns {boolean} true if the value was accepted, false if rejected
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

// =============================================================================
// TimerModule
// Handles tick(), onTimerComplete() stub, and wires start/stop/reset controls.
// setDuration() and timerState live above; this block completes the timer logic.
// =============================================================================

/**
 * Called on each setInterval tick.
 * Decrements remainingSeconds; when it hits zero, clears the interval,
 * marks the timer as stopped, and delegates to onTimerComplete().
 */
function tick() {
  if (timerState.remainingSeconds <= 0) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
    timerState.running = false;
    onTimerComplete();
    return;
  }
  timerState.remainingSeconds -= 1;
  renderTimerDisplay();
}

/**
 * Fires when the countdown reaches zero.
 * Notifies the user via the Notification API if permission has been granted,
 * or falls back to window.alert(). Then auto-resets the timer to the
 * configured duration without restarting the countdown.
 * Requirements: 2.6, 2.7
 */
function onTimerComplete() {
  // Notify the user — Notification API takes priority when permission is granted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Focus session complete!', { body: 'Time to take a break!' });
  } else {
    window.alert('Focus session complete!');
  }

  // Auto-reset to configured duration; do NOT restart the timer (Requirement 2.7)
  timerState.remainingSeconds = timerState.durationMinutes * 60;
  timerState.running = false;
  renderTimerDisplay();
}

/**
 * Wires the start, stop, and reset controls for the Focus Timer.
 * Must be called after DOMContentLoaded (invoked from AppInit).
 * Requirements: 2.3, 2.4, 2.5, 2.11
 */
function initTimerControls() {
  const startBtn = document.getElementById('timer-start');
  const stopBtn  = document.getElementById('timer-stop');
  const resetBtn = document.getElementById('timer-reset');

  if (startBtn) {
    startBtn.addEventListener('click', function () {
      // Do nothing if already running (Requirement 2.3)
      if (timerState.running) return;

      // Request notification permission before the first session (Requirement 2.11)
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      timerState.running = true;
      timerState.intervalId = setInterval(tick, 1000);
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', function () {
      // Pause the countdown while preserving remaining time (Requirement 2.4)
      if (!timerState.running) return;
      clearInterval(timerState.intervalId);
      timerState.intervalId = null;
      timerState.running = false;
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      // Always stop and restore display to configured duration (Requirement 2.5)
      clearInterval(timerState.intervalId);
      timerState.intervalId = null;
      timerState.running = false;
      timerState.remainingSeconds = timerState.durationMinutes * 60;
      renderTimerDisplay();
    });
  }
}

// =============================================================================
// TaskModule
// Full CRUD for to-do tasks: add, toggle, edit, delete, sort.
// Internal state: tasks array (loaded from StorageModule on init).
// =============================================================================

/**
 * Clears and re-renders all task items inside #task-list from the in-memory
 * tasks array exposed by TaskModule.getTasks().
 *
 * Each <li> contains:
 *   - A <label> wrapping a <input type="checkbox"> (checked when task.done)
 *     with a data-id attribute for event delegation.
 *   - A <span class="task-text"> (adds class "task-done" when task.done,
 *     which triggers CSS strikethrough — Requirement 3.7).
 *   - An Edit button   (type="button", class="btn-edit-task",   data-id=task.id)
 *   - A Delete button  (type="button", class="btn-delete-task", data-id=task.id)
 *
 * Does NOT touch #task-error — error visibility is managed by TaskModule.
 *
 * Requirements: 3.2, 3.7, 3.13
 */
function renderTaskList() {
  const list = document.getElementById('task-list');
  if (!list) return;

  // Clear existing items
  list.innerHTML = '';

  const tasks = TaskModule.getTasks();

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' task-done' : '');
    li.dataset.id = task.id;

    // Checkbox + accessible label
    const label = document.createElement('label');
    label.className = 'task-checkbox-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.done;
    checkbox.dataset.id = task.id;
    checkbox.setAttribute('aria-label', 'Mark task as ' + (task.done ? 'undone' : 'done'));

    label.appendChild(checkbox);

    // Task text span — strikethrough via .task-done class (Requirement 3.7)
    const span = document.createElement('span');
    span.className = 'task-text' + (task.done ? ' task-done' : '');
    span.textContent = task.text;

    label.appendChild(span);

    // Edit button — handler wired in task 6.5
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-edit-task';
    editBtn.dataset.id = task.id;
    editBtn.textContent = 'Edit';

    // Delete button — handler wired in task 6.3
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-delete-task';
    deleteBtn.dataset.id = task.id;
    deleteBtn.textContent = 'Delete';

    li.appendChild(label);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  });
}

const TaskModule = (function () {
  /** @type {Array<{id: string, text: string, done: boolean}>} */
  let tasks = [];

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Generates a collision-resistant id.
   * Uses `crypto.randomUUID()` when available (requires HTTPS / localhost).
   * Falls back to `Date.now().toString()` for plain `file://` usage.
   * @returns {string}
   */
  function generateId() {
    return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Date.now().toString();
  }

  /**
   * Normalizes task text for duplicate detection by trimming whitespace and
   * converting to lowercase.
   * @param {string} text
   * @returns {string}
   */
  function normalizeTask(text) {
    return text.trim().toLowerCase();
  }

  /**
   * Checks whether the normalized form of `text` already exists in the task
   * list, optionally excluding one task by id (used during inline edits so a
   * task is not flagged as a duplicate of itself).
   * @param {string} text
   * @param {string|null} [excludeId=null]
   * @returns {boolean}
   */
  function isDuplicate(text, excludeId = null) {
    const norm = normalizeTask(text);
    return tasks.some(t => t.id !== excludeId && normalizeTask(t.text) === norm);
  }

  /**
   * Returns the `#task-error` element, or `null` if the DOM is not yet ready.
   * @returns {HTMLElement|null}
   */
  function getErrorEl() {
    return document.getElementById('task-error');
  }

  /** Hides the inline task-error message. */
  function hideError() {
    const el = getErrorEl();
    if (el) el.style.display = 'none';
  }

  /** Shows the inline task-error message with a given text. */
  function showError(message) {
    const el = getErrorEl();
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Adds a new task to the list.
   *
   * Rejection rules (returns `false`):
   *   1. `text` is empty or contains only whitespace — rejected silently.
   *   2. Normalized `text` already exists in the list — rejected with an
   *      inline error message ("Task already exists").
   *
   * On success:
   *   - Generates a unique id, pushes `{ id, text: trimmed, done: false }`.
   *   - Persists the updated array via `StorageModule.saveTasks`.
   *   - Hides any previously visible error message.
   *   - Calls `renderTaskList()` to refresh the DOM.
   *   - Returns `true`.
   *
   * @param {string} text - Raw input from the user.
   * @returns {boolean} `true` if the task was added, `false` otherwise.
   */
  function addTask(text) {
    const trimmed = text.trim();

    // Rule 1: empty / whitespace-only — silent rejection
    if (!trimmed) return false;

    // Rule 2: duplicate — show error, reject
    if (isDuplicate(trimmed)) {
      showError('Task already exists');
      return false;
    }

    tasks.push({ id: generateId(), text: trimmed, done: false });
    StorageModule.saveTasks(tasks);
    hideError();
    renderTaskList();
    return true;
  }

  /**
   * Toggles the `done` state of the task with the given id.
   * Flips `task.done`, persists the updated array, and re-renders the list.
   * Does nothing if no task with that id is found.
   *
   * @param {string} id - The task's unique identifier
   * Requirements: 3.6, 3.7
   */
  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;
    StorageModule.saveTasks(tasks);
    renderTaskList();
  }

  /**
   * Removes the task with the given id from the tasks array.
   * Persists the updated array and re-renders the list.
   * Does nothing if no task with that id is found.
   *
   * @param {string} id - The task's unique identifier
   * Requirements: 3.10
   */
  function deleteTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return;
    tasks.splice(index, 1);
    StorageModule.saveTasks(tasks);
    renderTaskList();
  }

  /**
   * Sorts the tasks array in-place.
   * Order: tasks with `done === false` appear before tasks with `done === true`.
   * Within each group, tasks are sorted alphabetically by text using
   * `localeCompare` with case-insensitive sensitivity.
   * After sorting, persists and re-renders.
   * Requirements: 3.11, 3.12
   */
  function sortTasks() {
    tasks.sort(function (a, b) {
      // Pending (false) before completed (true)
      if (a.done !== b.done) return a.done ? 1 : -1;
      // Within the same group, sort alphabetically (case-insensitive)
      return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
    });
    StorageModule.saveTasks(tasks);
    renderTaskList();
  }

  /**
   * Wires all TaskModule DOM event listeners.
   * - `#task-add-btn` click → addTask from #task-input
   * - `#task-input` Enter keypress → same as clicking Add
   * - `#task-sort-btn` click → sortTasks()
   * - `#task-list` checkbox change → toggleTask (Requirement 3.6)
   * - `#task-list` .btn-delete-task click → deleteTask (Requirement 3.10)
   * Called once from `init()` after the initial render.
   * Requirements: 3.1, 3.6, 3.10, 3.11
   */
  function initEvents() {
    const input   = document.getElementById('task-input');
    const addBtn  = document.getElementById('task-add-btn');
    const sortBtn = document.getElementById('task-sort-btn');
    const list    = document.getElementById('task-list');

    if (addBtn && input) {
      addBtn.addEventListener('click', function () {
        if (addTask(input.value)) {
          input.value = '';
        }
      });

      // Allow submitting with the Enter key
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          if (addTask(input.value)) {
            input.value = '';
          }
        }
      });
    }

    if (sortBtn) {
      sortBtn.addEventListener('click', function () {
        sortTasks();
      });
    }

    // Delegated checkbox change → toggle done state (Requirement 3.6)
    if (list) {
      list.addEventListener('change', function (e) {
        const checkbox = e.target.closest('input[type="checkbox"][data-id]');
        if (checkbox) {
          toggleTask(checkbox.dataset.id);
        }
      });

      // Delegated delete button click → remove task (Requirement 3.10)
      list.addEventListener('click', function (e) {
        const deleteBtn = e.target.closest('.btn-delete-task');
        if (deleteBtn) {
          deleteTask(deleteBtn.dataset.id);
          return;
        }

        // Delegated edit button click → enter inline edit mode (Requirement 3.8)
        const editBtn = e.target.closest('.btn-edit-task');
        if (editBtn) {
          const taskId = editBtn.dataset.id;
          const li = list.querySelector('li[data-id="' + taskId + '"]');
          if (!li) return;

          const task = getTasks().find(t => t.id === taskId);
          if (!task) return;

          // Replace the <label> (checkbox + text span) with a text input
          const existingLabel = li.querySelector('label.task-checkbox-label');
          if (!existingLabel) return;

          const editInput = document.createElement('input');
          editInput.type = 'text';
          editInput.className = 'task-edit-input';
          editInput.value = task.text;
          editInput.dataset.id = taskId;

          existingLabel.replaceWith(editInput);

          // Replace Edit + Delete buttons with Save + Cancel
          const existingEditBtn  = li.querySelector('.btn-edit-task');
          const existingDeleteBtn = li.querySelector('.btn-delete-task');

          const saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn-save-edit';
          saveBtn.dataset.id = taskId;
          saveBtn.textContent = 'Save';

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'btn-cancel-edit';
          cancelBtn.dataset.id = taskId;
          cancelBtn.textContent = 'Cancel';

          if (existingEditBtn)   existingEditBtn.replaceWith(saveBtn);
          if (existingDeleteBtn) existingDeleteBtn.replaceWith(cancelBtn);

          // Focus the input for immediate typing
          editInput.focus();
          return;
        }

        // Delegated save button click — commit inline edit (Requirement 3.8, 3.9)
        const saveBtn = e.target.closest('.btn-save-edit');
        if (saveBtn) {
          const taskId = saveBtn.dataset.id;
          const li = list.querySelector('li[data-id="' + taskId + '"]');
          if (!li) return;

          const editInput = li.querySelector('.task-edit-input');
          if (!editInput) return;

          const trimmed = editInput.value.trim();

          // Empty input → treat as cancel (restore without saving)
          if (!trimmed) {
            renderTaskList();
            return;
          }

          // Duplicate check excluding the current task (Requirement 3.9)
          if (isDuplicate(trimmed, taskId)) {
            // Show inline error near the input without closing edit mode
            let errorSpan = li.querySelector('.task-edit-error');
            if (!errorSpan) {
              errorSpan = document.createElement('span');
              errorSpan.className = 'task-edit-error';
              editInput.insertAdjacentElement('afterend', errorSpan);
            }
            errorSpan.textContent = 'Task already exists';
            return;
          }

          // Valid — update, persist, re-render
          updateTask(taskId, trimmed);
          renderTaskList();
          return;
        }

        // Delegated cancel button click — exit edit mode without saving
        const cancelBtn = e.target.closest('.btn-cancel-edit');
        if (cancelBtn) {
          renderTaskList();
        }
      });
    }
  }

  /**
   * Initialises the module with a pre-loaded tasks array (e.g. from
   * `StorageModule.loadTasks()` called in AppInit).
   * @param {Array<{id: string, text: string, done: boolean}>} savedTasks
   */
  function init(savedTasks) {
    tasks = Array.isArray(savedTasks) ? savedTasks : [];
    renderTaskList();
    initEvents();
  }

  /**
   * Updates the text of the task with the given id.
   * Finds the task by id, sets `task.text` to `newText`, and persists the
   * updated array via `StorageModule.saveTasks`.
   *
   * @param {string} id - The task's unique identifier
   * @param {string} newText - The replacement text (assumed trimmed and validated by caller)
   * @returns {boolean} true if the task was found and updated, false otherwise
   * Requirements: 3.8, 3.9
   */
  function updateTask(id, newText) {
    const task = tasks.find(t => t.id === id);
    if (!task) return false;
    task.text = newText;
    StorageModule.saveTasks(tasks);
    return true;
  }

  /**
   * Returns a shallow copy of the current tasks array.
   * Useful for testing and for other modules that need a read-only snapshot.
   * @returns {Array<{id: string, text: string, done: boolean}>}
   */
  function getTasks() {
    return [...tasks];
  }

  return {
    init,
    addTask,
    getTasks,
    sortTasks,
    toggleTask,
    deleteTask,
    updateTask,
    // Exposed for use by the full implementations in tasks 6.3–6.8
    normalizeTask,
    isDuplicate,
  };
})();

// =============================================================================
// LinkModule
// Manages the Quick Links panel: normalises URLs, renders link cards, and
// exposes an init() method for bootstrapping with persisted data.
// CRUD event handlers (add, edit, delete) and modal logic are wired in
// tasks 8.3, 8.4, and 8.6. renderLinks() uses event delegation on
// #links-panel so those handlers work once attached.
// =============================================================================

/**
 * Ensures a URL string has an explicit http:// or https:// scheme.
 * If the URL (after trimming) does not already start with either scheme
 * (case-insensitive), "https://" is prepended.
 *
 * @param {string} url - Raw URL string entered by the user
 * @returns {string} URL guaranteed to begin with http:// or https://
 */
function normalizeUrl(url) {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed;
}

const LinkModule = {
  /** @type {Array<{id: string, label: string, url: string}>} */
  _links: [],

  /**
   * Tracks which link is currently being edited.
   * `null` when the modal is in add mode; set to the link's id in edit mode.
   * @type {string|null}
   */
  _editingId: null,

  /**
   * Returns the `<dialog id="links-modal">` element, or null if not in DOM.
   * @returns {HTMLDialogElement|null}
   */
  _getModal() {
    return document.getElementById('links-modal');
  },

  /**
   * Opens the Quick Links modal in either add or edit mode.
   *
   * Add mode  (mode === 'add'):
   *   - Clears both input fields
   *   - Clears any prior inline error
   *   - Sets `_editingId` to null
   *
   * Edit mode (mode === 'edit', linkId provided):
   *   - Looks up the link by id
   *   - Pre-populates the label and URL inputs with the existing values
   *   - Clears any prior inline error
   *   - Sets `_editingId` to the link's id
   *
   * Opens the native <dialog> via `showModal()`.
   *
   * Requirements: 4.3, 4.4, 4.8
   *
   * @param {'add'|'edit'} mode
   * @param {string|null} [linkId=null] - Required when mode === 'edit'
   */
  _openModal(mode, linkId = null) {
    const modal    = this._getModal();
    if (!modal) return;

    const labelInput = document.getElementById('link-label-input');
    const urlInput   = document.getElementById('link-url-input');
    const errorEl    = document.getElementById('link-modal-error');

    // Always clear any previous validation error
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }

    if (mode === 'edit' && linkId) {
      const link = this._links.find(l => l.id === linkId);
      if (!link) return; // guard: link not found, bail out
      if (labelInput) labelInput.value = link.label;
      if (urlInput)   urlInput.value   = link.url;
      this._editingId = linkId;
    } else {
      // Add mode — empty inputs
      if (labelInput) labelInput.value = '';
      if (urlInput)   urlInput.value   = '';
      this._editingId = null;
    }

    modal.showModal();

    // Move focus to the label input for keyboard / screen-reader users
    if (labelInput) labelInput.focus();
  },

  /**
   * Wires all modal-related event listeners:
   *   - `#links-add-btn` → opens modal in add mode (Requirement 4.3)
   *   - `#links-panel` delegated click for `.btn-edit-link` → opens modal in
   *     edit mode pre-populated with the clicked link's data (Requirement 4.8)
   *   - `#link-modal-cancel` → closes modal without changes (Requirement 4.4)
   *
   * Called once from `init()` after the initial render.
   *
   * Requirements: 4.3, 4.4, 4.8
   */
  initEvents() {
    const self = this;

    // "Add Link" button — opens modal in add mode
    const addBtn = document.getElementById('links-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        self._openModal('add');
      });
    }

    // Delegated listener on #links-panel — catches Edit and Delete button clicks
    // regardless of when the card was rendered (handles dynamic re-renders).
    const panel = document.getElementById('links-panel');
    if (panel) {
      panel.addEventListener('click', function (e) {
        const editBtn = e.target.closest('.btn-edit-link');
        if (editBtn) {
          self._openModal('edit', editBtn.dataset.id);
          return;
        }

        const deleteBtn = e.target.closest('.btn-delete-link');
        if (deleteBtn) {
          self.deleteLink(deleteBtn.dataset.id);
        }
      });
    }

    // Cancel button — closes modal without saving
    const cancelBtn = document.getElementById('link-modal-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        const modal = self._getModal();
        if (modal) modal.close();
        self._editingId = null;
      });
    }

    // Save button — validate inputs, persist, close modal (Requirements 4.5, 4.6)
    const saveBtn = document.getElementById('link-modal-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        const labelInput = document.getElementById('link-label-input');
        const urlInput   = document.getElementById('link-url-input');
        const errorEl    = document.getElementById('link-modal-error');

        const trimmedLabel = labelInput ? labelInput.value.trim() : '';
        const trimmedUrl   = urlInput   ? urlInput.value.trim()   : '';

        // Helper: show inline error and bail out
        function showModalError(msg) {
          if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = 'block';
          }
        }

        // Clear any previous error before re-validating
        if (errorEl) {
          errorEl.textContent = '';
          errorEl.style.display = 'none';
        }

        // Validation — Requirement 4.6
        if (!trimmedLabel) {
          showModalError('Label is required');
          return;
        }
        if (!trimmedUrl) {
          showModalError('URL is required');
          return;
        }

        const normalizedUrl = normalizeUrl(trimmedUrl);

        if (self._editingId === null) {
          // Add mode — generate a new id and push the link (Requirement 4.5)
          const newId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : Date.now().toString();

          self._links.push({ id: newId, label: trimmedLabel, url: normalizedUrl });
        } else {
          // Edit mode — update the existing link in-place (Requirement 4.8)
          const link = self._links.find(function (l) { return l.id === self._editingId; });
          if (link) {
            link.label = trimmedLabel;
            link.url   = normalizedUrl;
          }
          self._editingId = null;
        }

        StorageModule.saveLinks(self._links);
        self._renderLinks();

        const modal = self._getModal();
        if (modal) modal.close();
      });
    }

    // Note: Escape key is handled natively by the <dialog> element —
    // no extra listener needed.
  },

  /**
   * Initialises the module with a pre-loaded array of links and renders them.
   * Called by AppInit on DOMContentLoaded, passing the result of
   * StorageModule.loadLinks().
   *
   * @param {Array<{id: string, label: string, url: string}>} savedLinks
   */
  init(savedLinks) {
    this._links = Array.isArray(savedLinks) ? savedLinks : [];
    this._renderLinks();
    this.initEvents();
  },

  /**
   * Returns a shallow copy of the current links array.
   * @returns {Array<{id: string, label: string, url: string}>}
   */
  getLinks() {
    return this._links.slice();
  },

  /**
   * Removes the link with the given id from the links array.
   * Persists the updated array and re-renders the panel.
   * Does nothing if no link with that id is found.
   *
   * @param {string} id - The link's unique identifier
   * Requirements: 4.9
   */
  deleteLink(id) {
    const index = this._links.findIndex(l => l.id === id);
    if (index === -1) return;
    this._links.splice(index, 1);
    StorageModule.saveLinks(this._links);
    this._renderLinks();
  },

  /**
   * Clears and re-renders all link cards inside #links-panel.
   *
   * Each card contains:
   *   - A <strong> element showing the link label
   *   - An <a> element with href, target="_blank", and rel="noopener noreferrer"
   *   - An Edit button  (class "btn-edit-link",   data-id set to link.id)
   *   - A Delete button (class "btn-delete-link", data-id set to link.id)
   *
   * Requirements: 4.1, 4.2
   */
  _renderLinks() {
    const panel = document.getElementById('links-panel');
    if (!panel) return;

    panel.innerHTML = '';

    this._links.forEach(link => {
      const card = document.createElement('div');
      card.className = 'link-card';
      card.dataset.id = link.id;

      // Label
      const label = document.createElement('strong');
      label.className = 'link-label';
      label.textContent = link.label;

      // Clickable URL — opens in a new tab (Requirement 4.2)
      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'link-url';
      anchor.textContent = link.url;

      // Edit button
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-edit-link';
      editBtn.dataset.id = link.id;
      editBtn.textContent = 'Edit';

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-delete-link';
      deleteBtn.dataset.id = link.id;
      deleteBtn.textContent = 'Delete';

      card.appendChild(label);
      card.appendChild(anchor);
      card.appendChild(editBtn);
      card.appendChild(deleteBtn);
      panel.appendChild(card);
    });
  }
};

/**
 * Initialises the duration input control for the Focus Timer.
 *
 * On call:
 *   - Seeds `timerState` with `duration` so the in-memory state matches what
 *     was loaded from localStorage (or the default of 25).
 *   - Sets `#timer-duration-input`'s value to reflect that duration.
 *   - Calls `renderTimerDisplay()` so the MM:SS display is in sync.
 *   - Attaches `change` and `blur` listeners that call `setDuration(input.value)`.
 *     If `setDuration` rejects the value (returns `false`), the input snaps back
 *     to `timerState.durationMinutes` so the user always sees a valid number.
 *
 * @param {number} duration - A valid duration in [1, 120] from StorageModule.loadTimerDuration()
 * Requirements: 2.8, 2.9, 2.10, 5.3, 5.4
 */
function initTimerDurationInput(duration) {
  // Seed in-memory state from the persisted (or default) duration
  timerState.durationMinutes  = duration;
  timerState.remainingSeconds = duration * 60;

  const input = document.getElementById('timer-duration-input');
  if (!input) return;

  // Reflect the loaded duration in the input field
  input.value = duration;

  // Keep the MM:SS display in sync with the seeded state
  renderTimerDisplay();

  // Handler shared by both change and blur events
  function handleDurationChange() {
    const accepted = setDuration(input.value);
    if (!accepted) {
      // Snap back to the last valid value so the field is never left invalid
      input.value = timerState.durationMinutes;
    }
  }

  input.addEventListener('change', handleDurationChange);
  input.addEventListener('blur',   handleDurationChange);
}

// =============================================================================
// AppInit
// Bootstraps all modules in the correct dependency order on DOMContentLoaded.
//
// Order:
//   1. StorageModule.loadTimerDuration() → initTimerDurationInput(duration)
//      Seeds timerState, wires the duration input, and renders MM:SS display.
//   2. initTimerControls()
//      Attaches start / stop / reset button listeners.
//   3. StorageModule.loadTasks() → TaskModule.init(tasks)
//      Restores persisted tasks, renders the task list, and wires CRUD events.
//   4. StorageModule.loadLinks() → LinkModule.init(links)
//      Restores persisted links, renders link cards, and wires modal events.
//   5. ClockModule.init()
//      Renders the current time/date/greeting immediately and starts the
//      1-second update interval.
//
// Requirements: 2.1, 3.13, 4.10, 5.4
// =============================================================================
document.addEventListener('DOMContentLoaded', function () {
  // 1. Timer duration — restore from storage (defaults to 25 if nothing stored)
  const storedDuration = StorageModule.loadTimerDuration();
  initTimerDurationInput(storedDuration);

  // 2. Timer controls — start / stop / reset buttons
  initTimerControls();

  // 3. Task list — restore persisted tasks and wire all CRUD interactions
  const savedTasks = StorageModule.loadTasks();
  TaskModule.init(savedTasks);

  // 4. Quick links — restore persisted links and wire modal interactions
  const savedLinks = StorageModule.loadLinks();
  LinkModule.init(savedLinks);

  // 5. Live clock — render immediately then update every second
  ClockModule.init();
});
