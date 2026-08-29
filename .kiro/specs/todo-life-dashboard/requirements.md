# Requirements Document

## Introduction

The To-Do List Life Dashboard is a single-page, client-side web application that helps users organize their day. It displays the current time and date with a contextual greeting, a Pomodoro-style focus timer with an adjustable duration, a to-do list with full CRUD capabilities, and a quick links panel for bookmarking frequently visited websites. All data is persisted using the browser's Local Storage API. The application is built with HTML, CSS, and Vanilla JavaScript only, with no backend or build toolchain required, and is deployable as a static site (e.g., GitHub Pages).

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting Panel**: The section of the Dashboard that displays the current time, date, and time-based greeting.
- **Focus Timer**: The countdown timer component based on the Pomodoro technique.
- **To-Do List**: The task management component that allows users to create, read, update, and delete tasks.
- **Task**: A single item in the To-Do List with a text description and a completion state.
- **Quick Links**: A collection of user-defined URL bookmarks displayed as clickable cards or buttons.
- **Quick Links Modal**: The dialog popup used to add, edit, or delete Quick Links.
- **Local Storage**: The browser's `localStorage` Web Storage API used for client-side data persistence.
- **Pomodoro Session**: One countdown interval starting from the configured Focus Timer duration down to zero.
- **Duplicate Task**: A task whose text description, after trimming whitespace and ignoring letter case, is identical to an existing task in the To-Do List.

---

## Requirements

### Requirement 1: Greeting Panel

**User Story:** As a user, I want to see the current time, date, and a greeting relevant to the time of day, so that I can quickly orient myself when opening the Dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL display the current time in hours and minutes format (HH:MM), updated every second.
2. THE Dashboard SHALL display the current date including the day of the week, month, day number, and year.
3. WHEN the local hour is between 05:00 and 11:59, THE Greeting Panel SHALL display the greeting "Good Morning".
4. WHEN the local hour is between 12:00 and 17:59, THE Greeting Panel SHALL display the greeting "Good Afternoon".
5. WHEN the local hour is between 18:00 and 20:59, THE Greeting Panel SHALL display the greeting "Good Evening".
6. WHEN the local hour is between 21:00 and 04:59, THE Greeting Panel SHALL display the greeting "Good Night".

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a countdown focus timer so that I can track focused work sessions and be alerted when time is up.

#### Acceptance Criteria

1. THE Focus Timer SHALL default to a duration of 25 minutes on first use.
2. THE Focus Timer SHALL display the remaining time in MM:SS format.
3. WHEN the user activates the Start control, THE Focus Timer SHALL begin counting down one second at a time.
4. WHEN the user activates the Stop control, THE Focus Timer SHALL pause the countdown while preserving the remaining time.
5. WHEN the user activates the Reset control, THE Focus Timer SHALL stop the countdown and restore the display to the configured duration.
6. WHEN the countdown reaches 00:00, THE Focus Timer SHALL trigger a browser Notification if the user has granted notification permission, or display a visible on-screen alert if permission has not been granted.
7. WHEN the countdown reaches 00:00, THE Focus Timer SHALL automatically reset the display to the configured duration and stop the countdown.
8. THE Focus Timer SHALL provide an input control that allows the user to set the timer duration to any whole number of minutes between 1 and 120.
9. WHEN the user sets a new duration value and the timer is not running, THE Focus Timer SHALL immediately update the display to reflect the new duration.
10. IF the user sets a duration value outside the range of 1 to 120 minutes, THEN THE Focus Timer SHALL reject the value and retain the previously configured duration.
11. WHERE the browser supports the Notifications API, THE Dashboard SHALL request notification permission from the user before the first Pomodoro Session begins.

---

### Requirement 3: To-Do List

**User Story:** As a user, I want to manage a personal task list so that I can track what needs to be done and mark progress throughout my day.

#### Acceptance Criteria

1. THE To-Do List SHALL provide an input field and a submit control for adding a new Task.
2. WHEN the user submits a new Task, THE To-Do List SHALL display the Task in the task list.
3. WHEN the user submits a new Task, THE To-Do List SHALL persist all tasks to Local Storage.
4. IF the user submits a Task whose text, after trimming leading and trailing whitespace and converting to lowercase, matches the text of an existing Task using the same normalization, THEN THE To-Do List SHALL reject the submission and display an inline error message indicating the task already exists.
5. IF the user submits an empty or whitespace-only task text, THEN THE To-Do List SHALL reject the submission without adding a Task.
6. THE To-Do List SHALL provide a completion toggle control on each Task that marks the Task as done or undone.
7. WHEN a Task is marked as done, THE To-Do List SHALL apply a visual distinction (such as strikethrough text) to differentiate completed tasks from pending tasks.
8. THE To-Do List SHALL provide an edit control on each Task that allows the user to modify the Task's text.
9. WHEN the user saves an edited Task, THE To-Do List SHALL apply the same duplicate-check rule defined in criterion 4 against all other existing tasks.
10. THE To-Do List SHALL provide a delete control on each Task that removes the Task from the list and from Local Storage.
11. THE To-Do List SHALL provide a sort control that reorders the visible task list.
12. WHEN the sort control is activated, THE To-Do List SHALL sort tasks so that pending tasks appear before completed tasks, and tasks within each group are ordered alphabetically by text.
13. WHEN the Dashboard is loaded, THE To-Do List SHALL restore all tasks from Local Storage so that previously saved tasks are displayed.

---

### Requirement 4: Quick Links

**User Story:** As a user, I want to save and access frequently visited websites from the Dashboard so that I can open them quickly without navigating away.

#### Acceptance Criteria

1. THE Dashboard SHALL display saved Quick Links as clickable elements in the Quick Links panel.
2. WHEN the user clicks a Quick Link, THE Dashboard SHALL open the associated URL in a new browser tab.
3. THE Dashboard SHALL provide an "Add Link" control that opens the Quick Links Modal.
4. THE Quick Links Modal SHALL include input fields for a link label and a URL.
5. WHEN the user submits the Quick Links Modal with a valid label and a valid URL, THE Quick Links Modal SHALL save the new Quick Link to Local Storage and close the modal.
6. IF the user submits the Quick Links Modal with an empty label or an empty URL, THEN THE Quick Links Modal SHALL display an inline validation error and not save the entry.
7. IF the user submits a URL that does not begin with "http://" or "https://", THEN THE Quick Links Modal SHALL automatically prepend "https://" to the URL before saving.
8. THE Dashboard SHALL provide an edit control on each Quick Link that re-opens the Quick Links Modal pre-populated with that link's existing label and URL.
9. THE Dashboard SHALL provide a delete control on each Quick Link that removes the Quick Link from the panel and from Local Storage.
10. WHEN the Dashboard is loaded, THE Dashboard SHALL restore all Quick Links from Local Storage so that previously saved links are displayed.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my tasks and links to be saved automatically so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. THE Dashboard SHALL write the complete Task list to Local Storage after every add, edit, delete, or completion-toggle operation.
2. THE Dashboard SHALL write the complete Quick Links list to Local Storage after every add, edit, or delete operation.
3. THE Dashboard SHALL write the configured Focus Timer duration to Local Storage after the user sets a new duration.
4. WHEN the Dashboard is loaded, THE Dashboard SHALL read the Focus Timer duration from Local Storage and apply it as the active timer duration; if no stored value exists, the default of 25 minutes SHALL be used.

---

### Requirement 6: Technical and Structural Constraints

**User Story:** As a developer, I want the codebase to follow a clear file structure and technology constraints so that the project is easy to maintain and deploy.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using exactly one HTML file, one CSS file located inside a `css/` directory, and one JavaScript file located inside a `js/` directory.
2. THE Dashboard SHALL use only HTML, CSS, and Vanilla JavaScript with no external frameworks, libraries, or build tools.
3. THE Dashboard SHALL function correctly in the latest stable releases of Chrome, Firefox, Edge, and Safari without polyfills or vendor-specific workarounds.
4. THE Dashboard SHALL be deployable as a static site with no backend server, including deployment to GitHub Pages.
5. THE Dashboard SHALL load and become interactive within 3 seconds on a standard broadband connection with no external network requests required after initial load.
