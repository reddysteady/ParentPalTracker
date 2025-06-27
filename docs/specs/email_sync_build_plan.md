Incremental Build Plan
Increment 1: Basic Email Sync Infrastructure
Feature Summary: Connect actual Gmail service to sync endpoint and display basic email list

User-facing UI Changes:

Email sync button connects to real Gmail API (not test data)
Basic email list table showing sender, subject, date
Clear "Mock Data" indicators when Gmail not connected
Testing Steps:

Click "Connect Gmail" → OAuth flow completes
Click "Sync Emails" → Real emails appear in list (or "No emails found" message)
Verify email details match Gmail inbox
Acceptance Criteria:

Gmail sync pulls actual emails from user's account
Email list displays real data or clear empty state
No hardcoded test emails in production flow
Increment 2: Email Status & Event Detection UI
Feature Summary: Add status tracking and basic event detection indicators

User-facing UI Changes:

Status column shows "Synced", "Processing", or "Error"
Calendar icons (green/gray) based on event detection
Sync settings modal for domain filters and email limits
Testing Steps:

Sync emails → Status shows "Processing" then "Synced"
Emails with events show green calendar icon
Access sync settings → Modify domain filters → Sync respects new settings
Acceptance Criteria:

Each email shows clear sync status
Event detection indicators work (even if basic regex-based)
User can configure sync settings
Increment 3: Event Extraction & Summary Popup
Feature Summary: Implement basic event extraction and summary popup

User-facing UI Changes:

Clicking calendar icon opens event summary popup
Event details: title, date/time, location (when detected)
"View Full Event" link to Events page
Testing Steps:

Click green calendar icon → Event summary popup opens
Verify event details are extracted correctly
Click "View Full Event" → Navigates to Events page
Acceptance Criteria:

Event summary popup displays extracted information
Basic event extraction works (regex fallback if OpenAI unavailable)
Navigation to Events page functions
Increment 4: Error Handling & User Feedback
Feature Summary: Comprehensive error handling and user feedback system

User-facing UI Changes:

Toast notifications for sync status
Detailed error messages with actionable guidance
Retry buttons for failed operations
Testing Steps:

Disconnect internet → Sync fails → Clear error message with retry option
Revoke Gmail permissions → Auth error with re-authenticate button
Hit rate limits → Appropriate countdown/wait message
Acceptance Criteria:

All error states show clear, actionable messages
Users can recover from errors without confusion
No silent failures or generic error messages
Increment 5: Advanced Features & Polish
Feature Summary: Email deletion, duplicate prevention, accessibility improvements

User-facing UI Changes:

Delete email functionality with confirmation
Duplicate event warnings
Full keyboard navigation support
Testing Steps:

Delete email → Confirmation dialog → Email removed from list
Sync duplicate events → Warning prevents duplicates
Navigate entire interface using only keyboard
Acceptance Criteria:

Email deletion works with proper confirmation
Duplicate events are prevented
Full accessibility compliance