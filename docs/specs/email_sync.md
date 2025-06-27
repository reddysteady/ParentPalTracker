# Sync Email Feature Spec

## Goal

Develop the Sync Emails feature as specified below. The build must be delivered incrementally, with each increment user-testable via the UI.

* No fake data, no fallback/mock data unless clearly indicated in the UI (“Mock Data” badge/message) so that testing is always transparent.
* Each increment must include:

  * User test steps (UI-driven)
  * Clear acceptance criteria
  * UI should surface when real data is unavailable or the implementation is not complete

## Build Plan Instructions

1. **Review the full spec and break the build into logical, user-facing increments (milestones).**
   Each increment should deliver a piece of end-to-end functionality (even if minimal) that the user can test via the UI.

2. **For each increment, provide:**

   * **Feature summary:** What is delivered
   * **User-facing UI changes**
   * **Testing steps:** What the user must do to verify it works, in the UI
   * **Acceptance criteria:** How the user/dev will know the increment is complete
   * **Notes:** If mock data is displayed, the UI must visibly indicate this (e.g., a “Mock Data” banner/message in the component).
   * **If real API/backend integration is not yet implemented, ensure all actions clearly surface their placeholder/mock state in the UI.**

3. **All functionality should prioritize real data and connectivity first.**

   * Only allow mock/test data as a temporary placeholder, never as the default experience.

4. **Build should start with the core user journey:**

   * Gmail auth & sync settings UI
   * Fetch & display real emails (with transparent fallback if Gmail not yet connected)
   * Display of sync status, event extraction (basic/placeholder at first if necessary, but clearly labeled as such)
   * Event summary popup
   * Error and edge case handling in the UI (must always surface real state/errors, not silently fallback)

5. **After each increment, the user should be able to confirm via the UI what is working and what is pending/placeholder.**

**If you find any technical blockers or gaps in the provided spec, list them before proceeding with the plan.**
**Do not implement any code until the incremental build plan is complete and approved.**

---

## Feature Overview

The Sync Emails feature provides seamless integration with users’ Gmail accounts, enabling them to securely authenticate, fetch, and view recent emails directly within the app. The system analyzes incoming emails to automatically identify and extract structured event details—such as meetings, appointments, or important dates—which are then displayed alongside the email in an intuitive interface. Users can quickly distinguish emails that have events, view rich event summaries, and navigate to a dedicated Events page for deeper management. Comprehensive error handling, user feedback, and clear status indicators ensure a smooth, reliable experience throughout the sync and event extraction process.

## Sync Settings

* A "Sync Settings" button is visible on the Gmail Integration screen.
* Clicking it opens a modal or side panel allowing the user to:

  * **Configure Email Domain Filter**: Add, edit, or remove domain patterns used for filtering emails (e.g., *@*.edu, *@school*, custom entries). Example input: text field with add/remove chips for each domain.
  * **Set Maximum Emails to Pull**: Specify how many emails are pulled per sync (default: 20, can be adjusted up or down, max per Gmail API or system performance). Example input: number field with min/max validation.
  * **Save or Cancel**: Save applies changes for future syncs; Cancel discards edits.
* The sync process uses these settings each time "Sync Emails" is clicked. Settings are persistent for each user.

### Email List View

* **Description**: Displays a filterable and searchable table synced emails with details:

  * Sender - sender of the email 
  * Subject - subject line&#x20;
  * Date - date the email was received
  * Status

    * Pending Sync(if that state is possible),&#x20;
    * Fully synced
    * Any error message
    * Delete (trash) icon - to delete the email from the table (this removes the email but does not remove the event, as events have to be deleted separately) - shows delete confirmation popup
  * Event: displays a green calendar icon if an event was extracted, or a gray outlined calendar icon if no event was found. Hovering shows a tooltip with status.
    Clicking the icon opens a popup with Event Summary, which includes a “View Full Event” link or button to navigate to the Event on the Events page.

### Event Summary

* **Description:** Summarizes the details of the event extracted from the selected email.
* **Shows:**

  * **Event Title** (from email subject or parsed content)
  * **Date & Time** (start and end)
  * **Location** (if available)
  * **Participants/Attendees** (if parsed, e.g., invitees on a calendar event)
  * **Description/Notes** (body or summary of the event)
  * **Clothes/Equipment**: if any specific clothing or equipment is required
  * **Full event link/button**

## User Experience & Workflow

1. **Initiate Sync**

   * User clicks “Sync Emails” button.
   * App authenticates with Gmail (if needed).
2. **Fetch & Display Emails**

   * System fetches recent emails.
   * Emails appear in the **Email List View** table with details: sender, subject, date, sync status.
3. **Status & Actions**

   * Each row shows:

     * Sync status (Pending, Synced, Error)
     * Green calendar icon if an event is extracted; gray if not.
     * Trash icon for deleting email from table (with confirmation).
     * Clicking the calendar icon opens **Event Summary**.
4. **View Event Details**

   * Clicking the event icon opens a popup with **Event Summary** (title, time, location, etc.).
5. **Error Handling**

   * Any errors (auth, sync, parsing, event creation) show inline or as toast, with actionable guidance (retry, re-authenticate, contact support).

## Required Frontend Functions & Components

* **Tab Navigation:** Implement JavaScript function (e.g., showTab(tabName)) for switching between different UI tabs (such as Inbox, Events, Settings), reflecting current state in the UI.
* **Email List Display & State Management:** JS must fetch emails from backend, render email list dynamically, manage state for statuses, events, and errors. All actions (delete, view event, update status) are interactive.
* **Event Summary Popups:** Clicking the event icon triggers a modal popup rendering event details, with accessible close controls.
* **Gmail Sync Button:** Clicking triggers API call to backend to start sync using current filter/limit settings; disables while syncing; updates status in real time.
* **Status Updates:** Use JS to show toasts, banners, or inline status as emails are fetched/processed (e.g., syncing, error, completed).
* **Error Handling:** All frontend error states display relevant user messaging per spec. Show error banners/toasts with clear actions.

## Backend & API Requirements

* **Gmail API Integration:**

  * Enforce all domain filtering, unread filter, and max email settings from user configuration.
  * Support backend pagination for large result sets. Expose pagination tokens/links in API.
  * Implement Gmail API rate limiting and gracefully handle quota errors (with user feedback).
* **Sync Endpoint:** Connect /api/gmail/sync to actual Gmail service (not test data). Remove or hide test email injection code in production.
* **Event Extraction (AI/NLP):**

  * On failure to extract an event (e.g., OpenAI unavailable), fallback to regex-based extraction, or store email with 'Extraction Failed' status.
  * All event extraction errors must be logged and surfaced to user as partial/failed extraction.
  * Prevent duplicate event creation (match on title, time, and source email).
* **Authentication Enforcement:**

  * All sync and email/event API endpoints require user authentication. Unauthenticated users are prompted to sign in.

## Database Schema Requirements

* **Emails Table:** Must include fields for:

  * status (pending\_sync, synced, extraction\_failed, error)
  * sync\_status or processing\_status
  * all parsed event fields (title, time, location, participants, clothes/equipment)
  * reference to user/account
* **Audit Log Table:**

  * Record all user actions: sync, delete, view event, error encountered
  * Include timestamps and userId for all actions
* **Indexes:**

  * Add indexes for email status, sync time, and userId for efficient queries with large datasets

## Performance, Accessibility, & Responsiveness

* **Frontend and backend must both support pagination/infinite scroll for 50+ emails.**
* **Touch and mobile support:** All interactive controls must be touch-friendly and responsive.
* **Accessibility:** All ARIA labeling, keyboard navigation, and color contrast per spec must be validated in both code and UI testing.
* **Glossary:**

  * **Sync:** End-to-end flow from Gmail fetch → NLP event extraction → UI status update
  * **Fetch:** Raw email retrieval only

### Terminology & Consistency

* "Sync" refers to: fetching emails, attempting event extraction, and updating sync status. “Synced emails” are all emails fetched during the session, regardless of whether an event was extracted.
* The delete (trash) icon removes the email from the list but does not delete it from Gmail or remove any associated event. Consider labeling as "Remove from View."

### Empty States & Loading Indicators

* If no emails are found/fetched: Display a friendly message, e.g., “No recent emails found. Try syncing again.”
* If no events are detected in any emails: Display, “No events found in your recent emails.”
* While sync is in progress: Show a loading spinner or skeleton state in the Email List View.

### Edge Cases

* **Duplicate Events:** If the same event is extracted more than once (by matching title, time, and source email), display a warning and prevent duplicate creation.
* **Partial Extraction:** If only some fields are parsed (e.g., time but not location), display available info and indicate missing fields (e.g., “Location not found”).

### Accessibility

* All interactive elements (icons, buttons, links) must have descriptive aria-labels and be accessible by keyboard navigation.
* Tooltips must be accessible, not only hover-based.
* Icons must have sufficient color contrast and support color-blind users.

### Settings & Permissions

* Users can view or revoke Gmail permissions from the Account Settings page.
* Only Gmail "read" permissions are required; the app does not modify or delete emails in Gmail. State this explicitly in the UI for user confidence.

### Logging & Audit Trail

* All sync errors and user actions (sync, delete, view event) should be logged for troubleshooting. Display a reference code in user error messages when relevant.

### Rate Limits & Feedback

* If Gmail API rate limits are hit, display: “You’ve reached your sync limit. Try again later.”
* Specify how often users can trigger manual sync (e.g., no more than once every 5 minutes), and show a countdown or disabled button if a sync is attempted too soon.

### Scalability & Pagination

* For long lists (e.g., 50+ emails), add pagination or infinite scroll to the Email List View.
* Indicate total number of emails fetched and how many are visible.

### Design & Dev Handoff

* Reference Figma/visual mocks for icon use, spacing, and palette (if available). If not, describe visual style preferences (e.g., Material Icons, green/gray palette).

---

### Types of Errors

* **Authentication Errors:** User not logged in, or Gmail authentication expired.
* **Sync Failures:** Issues connecting to Gmail, rate limits, or network errors.
* **Parsing Errors:** Email could not be read or parsed for events.
* **Event Creation Errors:** Unable to create or display an event.

### UI Guidelines

* **Visibility:** Display error messages inline (near the relevant UI component) and/or as toast notifications.
* **Clarity:** Use plain, actionable language. State what went wrong and how to fix it if possible.
* **Actionable:** Where relevant, include a button or link to retry the action (e.g., “Re-authenticate Gmail”).
* **Reporting:** Persistent errors should optionally show a “Report Issue” or “Contact Support” link.

### Example Messages

* **Authentication:** “Session expired. Please log in to your Gmail account again.” \[Re-authenticate]
* **Sync Failure:** “We couldn’t sync your emails. Please check your connection and try again.” \[Retry]
* **Parsing Error:** “We couldn’t read this email. If this keeps happening, please contact support.”
* **Event Creation:** “Could not create event from this email. Please try again later.”
