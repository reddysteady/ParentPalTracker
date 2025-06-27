
# ParentPal Current State Architecture

*Generated: January 26, 2025*

## Overview

ParentPal is a web application designed to help parents stay on top of their children's events, responsibilities, and changing schedules by intelligently extracting information from school emails, scanned invites, and other inputs—then aligning it with their parenting schedule to generate actionable reminders, briefings, and smart preparation workflows.

The current implementation is in **partial development state** with core infrastructure present but incomplete functionality.

---

## Frontend Architecture

### Technology Stack
- **Static HTML/CSS/JavaScript** (no framework)
- **Progressive Web App** approach with responsive design
- **Mobile-first** interface design

### Current Implementation Status
- ✅ **Basic HTML Structure** (`public/index.html`)
  - Tab-based navigation (Dashboard, Children, Events, Gmail, Settings)
  - Responsive grid layout with cards
  - Modern CSS styling with animations
- ❌ **JavaScript Functionality** - Not implemented
- ❌ **API Integration** - No HTTP client or data binding
- ❌ **State Management** - No client-side state handling

### File Structure
```
public/
└── index.html          # Single-page application shell
```

---

## Backend Architecture

### Technology Stack
- **Node.js** with TypeScript
- **Express.js** web server framework
- **Drizzle ORM** for database operations
- **Neon Serverless** PostgreSQL database

### Server Entry Point (`server/index.ts`)
**Status: ✅ Functional but incomplete**

```typescript
// Core server setup present:
- Express app initialization
- CORS and JSON middleware
- Static file serving from /public
- Routes mounting from ./routes
- Environment variable access
- Health logging on startup
```

**Missing:**
- Environment variable loading (dotenv)
- Error handling middleware
- Request logging
- Graceful shutdown handling

### API Layer (`server/routes.ts`)

**Status: ✅ Basic CRUD endpoints implemented**

**Implemented Endpoints:**
```
GET  /api/health           # Health check
GET  /api/users            # List all users
POST /api/users            # Create user
GET  /api/children         # List all children
POST /api/children         # Create child
POST /api/emails           # Store email
GET  /api/events           # List all events
POST /api/events           # Create event
GET  /api/debug/oauth      # OAuth debugging
GET  /api/auth/google      # Gmail OAuth initiation
GET  /api/auth/google/callback  # OAuth callback
POST /api/gmail/setup      # Gmail integration setup
POST /api/gmail/sync/:userId    # Manual Gmail sync
POST /api/gmail/monitor/:userId # Start Gmail monitoring
```

**Missing:**
- Authentication middleware
- Request validation
- Authorization checks
- Error handling
- Rate limiting

### Database Layer

#### Schema (`shared/schema.ts`)
**Status: ❌ Empty file - Schema not defined**

#### Database Connection (`server/db.ts`)
**Status: ✅ Configured but dependent on environment**

```typescript
// Present configuration:
- Neon serverless connection pool
- Drizzle ORM initialization
- WebSocket configuration for Neon
- Environment variable dependency (DATABASE_URL)
```

**Issues:**
- Empty schema import will cause runtime errors
- No migration system implemented
- No connection error handling

---

## Service Layer Architecture

### Email Processing (`server/email-service.ts`)
**Status: ✅ Service structure defined**

**Capabilities:**
- Email ingestion interface defined
- User lookup by custom email address
- Integration with NLP service for event extraction
- SMS notification triggering

**Missing:**
- Actual implementation of processIncomingEmail function
- Error handling and validation
- Database integration

### Gmail Integration (`server/gmail-service.ts`)
**Status: ✅ OAuth flow implemented**

**Capabilities:**
- Google OAuth 2.0 authentication flow
- Authorization URL generation
- Token exchange handling
- Environment-based configuration

**Production Requirements:**
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

### SMS Service (`server/sms-service.ts`)
**Status: ✅ Service interface with dev/prod modes**

**Development Mode:**
- Console logging for SMS messages
- Mock message ID generation

**Production Mode:**
- Twilio integration ready
- Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

### NLP Processing (`server/nlp.ts`)
**Status: ❌ File exists but not documented in codebase**

---

## Data Flow Architecture

### Current Data Flow (Theoretical)
```
1. School Email → Gmail OAuth → Gmail Service
2. Gmail Service → Email Service → NLP Processing
3. NLP Processing → Event Extraction → Database Storage
4. Database → API Endpoints → Frontend Display
5. Event Processing → SMS Service → Parent Notifications
```

### Actual Working Flow (Limited)
```
1. Direct API calls → Database (if schema exists)
2. Gmail OAuth → Token exchange → Frontend
3. Manual email processing → Console logging
```

---

## Environment Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL=neon_connection_string

# Google Gmail API
GOOGLE_CLIENT_ID=google_oauth_client_id
GOOGLE_CLIENT_SECRET=google_oauth_secret
GOOGLE_REDIRECT_URI=https://parentpaltracker.REPL_OWNER.replit.dev/api/auth/google/callback

# OpenAI (for NLP)
OPENAI_API_KEY=openai_api_key

# Twilio SMS
TWILIO_ACCOUNT_SID=twilio_account_sid
TWILIO_AUTH_TOKEN=twilio_auth_token  
TWILIO_PHONE_NUMBER=twilio_phone_number

# Server
NODE_ENV=development
PORT=5000
DEV_MODE=true
```

### Current Status
- ❌ No .env file or environment loading
- ✅ Environment template exists (.env.example)
- ❌ No environment validation

---

## Deployment Architecture

### Replit Configuration (`.replit`)
```yaml
modules: ["nodejs-20"]
workflows:
  - Start ParentPal Server:
    - npm install
    - npx tsx server/index.ts
ports:
  - localPort: 5000 → externalPort: 80
```

### Current Deployment Status
- ✅ Replit environment configured
- ✅ Node.js 20 runtime
- ✅ TypeScript execution via tsx
- ✅ Port forwarding configured (5000→80)

---

## Critical Architecture Gaps

### 1. Database Schema Missing
- `shared/schema.ts` is empty
- No table definitions for users, children, events, emails
- Database operations will fail at runtime

### 2. Frontend-Backend Integration Missing
- No API client in frontend
- No data binding or state management
- Static HTML with no dynamic functionality

### 3. Authentication System Missing
- No user authentication middleware
- No session management
- All API endpoints are public

### 4. Environment Configuration Missing
- No dotenv loading in server
- No environment validation
- Development vs production configuration gaps

### 5. Error Handling Missing
- No global error handling middleware
- No request validation
- No logging framework

---

## Recommended Next Steps

1. **Complete Environment Setup** (Priority 1)
   - Add dotenv loading to server/index.ts
   - Create .env file from template
   - Add environment validation

2. **Implement Database Schema** (Priority 2)
   - Define tables in shared/schema.ts
   - Set up database migrations
   - Test database connectivity

3. **Add Authentication System** (Priority 3)
   - Implement JWT-based authentication
   - Add authentication middleware
   - Secure API endpoints

4. **Complete Frontend Integration** (Priority 4)
   - Add JavaScript API client
   - Implement data binding
   - Add error/loading states

This architecture documentation reflects the current partial implementation state and highlights the work needed to achieve a fully functional ParentPal application.
