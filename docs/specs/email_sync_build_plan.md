
# Email Sync Feature - Incremental Build Plan

## Technical Gaps & Blockers Identified

1. **Frontend JavaScript Missing**: The spec describes rich interactive functionality, but `public/index.html` only has partial JavaScript implementation
2. **Gmail Sync Disconnected**: The `/api/gmail/sync` endpoint uses hardcoded test data instead of the actual Gmail service
3. **Empty NLP Service**: `server/nlp.ts` is completely empty, but event extraction is core to the feature
4. **Database Schema Gaps**: Missing status fields for emails and events as specified
5. **No Tab Navigation**: The spec references `showTab()` function that doesn't exist
6. **Authentication Missing**: No user authentication system for Gmail integration

---

## Increment 1: Basic Email Sync Infrastructure

**Feature Summary**: Connect actual Gmail service to sync endpoint and display basic email list

**User-facing UI Changes**:
- Email sync button connects to real Gmail API (not test data)
- Basic email list table showing sender, subject, date
- Clear "Mock Data" indicators when Gmail not connected
- Basic tab navigation between Gmail and Events sections

**Testing Steps**:
1. Click "Connect Gmail" → OAuth flow completes
2. Click "Sync Emails" → Real emails appear in list (or "No emails found" message)
3. Verify email details match Gmail inbox
4. Tab navigation works between sections

**Acceptance Criteria**:
- Gmail sync pulls actual emails from user's account
- Email list displays real data or clear empty state
- No hardcoded test emails in production flow
- Tab navigation functional

**Implementation Tasks**:
- [ ] Connect `/api/gmail/sync` endpoint to actual Gmail service
- [ ] Remove hardcoded test data from sync endpoint
- [ ] Implement basic email list rendering in frontend
- [ ] Add `showTab()` function for navigation
- [ ] Add OAuth flow for Gmail authentication
- [ ] Display "Mock Data" badges when appropriate

---

## Increment 2: Email Status & Event Detection UI

**Feature Summary**: Add status tracking and basic event detection indicators

**User-facing UI Changes**:
- Status column shows "Synced", "Processing", or "Error"
- Calendar icons (green/gray) based on event detection
- Sync settings modal for domain filters and email limits
- Loading states during sync operations

**Testing Steps**:
1. Sync emails → Status shows "Processing" then "Synced"
2. Emails with events show green calendar icon
3. Access sync settings → Modify domain filters → Sync respects new settings
4. Verify loading states appear during operations

**Acceptance Criteria**:
- Each email shows clear sync status
- Event detection indicators work (even if basic regex-based)
- User can configure sync settings
- All loading states are visible

**Implementation Tasks**:
- [ ] Add status field to emails database table
- [ ] Implement sync settings modal UI
- [ ] Add calendar icon logic (green/gray states)
- [ ] Basic regex-based event detection fallback
- [ ] Real-time status updates during sync
- [ ] Domain filter and email limit configuration

---

## Increment 3: Event Extraction & Summary Popup

**Feature Summary**: Implement basic event extraction and summary popup

**User-facing UI Changes**:
- Clicking calendar icon opens event summary popup
- Event details: title, date/time, location (when detected)
- "View Full Event" link to Events page
- Event extraction status indicators

**Testing Steps**:
1. Click green calendar icon → Event summary popup opens
2. Verify event details are extracted correctly
3. Click "View Full Event" → Navigates to Events page
4. Test with emails that have partial event data

**Acceptance Criteria**:
- Event summary popup displays extracted information
- Basic event extraction works (regex fallback if OpenAI unavailable)
- Navigation to Events page functions
- Partial extraction handling works

**Implementation Tasks**:
- [ ] Implement `server/nlp.ts` with OpenAI integration
- [ ] Add regex-based fallback event extraction
- [ ] Create event summary popup component
- [ ] Link events to Events page
- [ ] Handle partial extraction scenarios
- [ ] Store extracted events in database

---

## Increment 4: Error Handling & User Feedback

**Feature Summary**: Comprehensive error handling and user feedback system

**User-facing UI Changes**:
- Toast notifications for sync status
- Detailed error messages with actionable guidance
- Retry buttons for failed operations
- Rate limit handling with countdown timers

**Testing Steps**:
1. Disconnect internet → Sync fails → Clear error message with retry option
2. Revoke Gmail permissions → Auth error with re-authenticate button
3. Hit rate limits → Appropriate countdown/wait message
4. Test all error scenarios have actionable recovery

**Acceptance Criteria**:
- All error states show clear, actionable messages
- Users can recover from errors without confusion
- No silent failures or generic error messages
- Rate limiting properly communicated

**Implementation Tasks**:
- [ ] Implement toast notification system
- [ ] Add comprehensive error handling for all API calls
- [ ] Gmail rate limit detection and handling
- [ ] Retry mechanisms for failed operations
- [ ] Authentication error recovery flows
- [ ] Error logging and audit trail

---

## Increment 5: Advanced Features & Polish

**Feature Summary**: Email deletion, duplicate prevention, accessibility improvements

**User-facing UI Changes**:
- Delete email functionality with confirmation
- Duplicate event warnings
- Full keyboard navigation support
- Mobile responsiveness
- Accessibility improvements

**Testing Steps**:
1. Delete email → Confirmation dialog → Email removed from list
2. Sync duplicate events → Warning prevents duplicates
3. Navigate entire interface using only keyboard
4. Test on mobile devices
5. Validate accessibility with screen reader

**Acceptance Criteria**:
- Email deletion works with proper confirmation
- Duplicate events are prevented
- Full accessibility compliance
- Mobile-friendly interface
- Complete keyboard navigation

**Implementation Tasks**:
- [ ] Email deletion with confirmation dialog
- [ ] Duplicate event detection and prevention
- [ ] ARIA labels and keyboard navigation
- [ ] Mobile responsive design
- [ ] Pagination for large email lists
- [ ] Performance optimizations
- [ ] Final accessibility audit

---

## Database Schema Updates Required

```sql
-- Add status fields to emails table
ALTER TABLE emails ADD COLUMN status VARCHAR(50) DEFAULT 'pending_sync';
ALTER TABLE emails ADD COLUMN sync_status VARCHAR(50);
ALTER TABLE emails ADD COLUMN processing_status VARCHAR(50);

-- Add event extraction fields
ALTER TABLE emails ADD COLUMN event_extracted BOOLEAN DEFAULT FALSE;
ALTER TABLE emails ADD COLUMN extraction_status VARCHAR(50);

-- Add user settings table for sync configuration
CREATE TABLE IF NOT EXISTS user_sync_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  domain_filters TEXT[], 
  max_emails INTEGER DEFAULT 20,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id INTEGER,
  details JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints to Implement

- `GET /api/gmail/auth` - Gmail OAuth flow
- `POST /api/gmail/sync/:userId` - Real Gmail sync (remove test data)
- `GET /api/emails/:userId` - Fetch user emails with pagination
- `DELETE /api/emails/:emailId` - Delete email from view
- `GET /api/events/:eventId` - Get event details
- `PUT /api/user-settings/sync` - Update sync settings
- `GET /api/user-settings/sync` - Get current sync settings

---

## Implementation Priority

**Start with Increment 1** as it establishes the core data flow and removes the biggest blocker (test data vs real Gmail integration). Each increment builds functionally on the previous one, ensuring users can always test real functionality.

The build follows the principle of **real data first** - every increment prioritizes actual API integration over mock data, with clear UI indicators when fallbacks are used.
