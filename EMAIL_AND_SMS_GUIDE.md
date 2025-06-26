# ParentPal Email Ingestion & SMS System

## How Email Ingestion Works

### 1. Development/Testing Mode (Current)
**What's implemented now:**
- Manual email entry via web interface
- Email forwarding simulation endpoint
- AI processing with OpenAI GPT-4o
- Event extraction and storage

**How to test:**
1. Create a user profile
2. Add children to your profile
3. Use the "Email Forwarding" form to simulate school emails
4. Watch as AI extracts events automatically

### 2. Production Email Ingestion (Next Step)

**Email Service Options:**

#### Option A: Webhook-Based (Recommended)
- **Services:** SendGrid, Mailgun, AWS SES
- **How it works:**
  1. User gets custom address: `yourname@parentpal.app`
  2. Parents forward school emails to this address
  3. Email service processes incoming mail
  4. Service sends webhook to `/api/webhook/email`
  5. ParentPal processes email instantly with AI

#### Option B: IMAP Polling
- **Services:** Gmail, custom email hosting
- **How it works:**
  1. Each user gets dedicated email account
  2. Background service polls every 5 minutes
  3. Downloads new emails via IMAP
  4. Processes emails with AI
  5. Deletes/archives processed emails

#### Option C: Email Forwarding Rules
- **Services:** Gmail forwarding, Outlook rules
- **How it works:**
  1. Parents set up forwarding in their email
  2. School emails auto-forward to ParentPal
  3. Dedicated inbox processes forwards
  4. AI extracts events from forwarded content

### 3. AI Event Extraction Process

**What the AI looks for:**
- Event names (field trips, assemblies, dress-up days)
- Dates and times
- Required preparation (costumes, money, forms)
- Cancellations or changes
- Child names (to match to user's children)

**Example input:**
```
Subject: Grade 2 Zoo Field Trip - Permission Slips Due Friday

Dear Parents,

We're excited to announce our upcoming field trip to the city zoo on Thursday, March 15th. Please return permission slips and $12 for admission by Friday, March 10th.

Students should bring a packed lunch and wear comfortable walking shoes.

Thank you,
Mrs. Johnson
```

**AI extracts:**
```json
{
  "title": "Zoo Field Trip",
  "eventDate": "2024-03-15",
  "preparation": "Permission slip and $12 due by March 10th, packed lunch, comfortable shoes",
  "description": "Grade 2 field trip to city zoo"
}
```

## How SMS Notifications Work

### 1. Current SMS System
**Service:** Twilio integration (requires API keys)
**Capabilities:**
- Real-time SMS alerts
- Daily briefings
- Event reminders
- Cancellation notices

### 2. SMS Trigger Logic
**Automatic SMS sent when:**
- Event is within 2 days and parent is responsible
- Event is canceled on parent's day
- Last-minute changes affect parent's schedule
- Daily briefing (morning summary)

### 3. Setting Up SMS (Production)

**Required Twilio Secrets:**
- `TWILIO_ACCOUNT_SID` - Your Twilio account ID
- `TWILIO_AUTH_TOKEN` - Your Twilio auth token  
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number

**Phone Number Verification:**
- Trial accounts require verified numbers
- Production accounts can text any number
- US format: +1234567890

### 4. SMS Message Examples

**Event Reminder:**
```
Emma's picture day tomorrow - remember school uniform
```

**Preparation Alert:**
```
Prep needed for Jake's science fair: poster board due Monday
```

**Cancellation Notice:**
```
CANCELED: Sophia's field trip today due to weather
```

**Daily Briefing:**
```
Today: Emma's library day (return books), Jake's early dismissal (1:30pm pickup)
```

## Integration Setup for Production

### Step 1: Choose Email Service
1. **SendGrid** (recommended for scale)
   - Set up inbound email parsing
   - Configure webhook to `/api/webhook/email`
   - Custom domain: `mail.parentpal.app`

2. **Mailgun** (good alternative)
   - Route incoming emails to webhook
   - Built-in email validation
   - Good deliverability rates

### Step 2: Set up SMS Service
1. **Create Twilio account**
2. **Purchase phone number**
3. **Add API credentials as secrets**
4. **Test with verified numbers**

### Step 3: DNS Configuration
```
MX record: mail.parentpal.app → your-email-service
CNAME: parentpal.app → your-email-service
```

### Step 4: User Onboarding Flow
1. User signs up for ParentPal
2. System generates: `firstname-lastname@parentpal.app`
3. User adds custom address to school contact info
4. User sets up email forwarding rules
5. User verifies phone number for SMS

## Testing the System

### Email Processing Test
```bash
curl -X POST http://localhost:3000/api/email/forward \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@parentpal.app",
    "from": "school@example.com", 
    "subject": "Picture Day Tomorrow",
    "body": "Dear parents, picture day is tomorrow. Students should wear their best clothes."
  }'
```

### SMS Test
```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "Test SMS from ParentPal",
    "userId": 1
  }'
```

## Architecture Benefits

### Real-time Processing
- Instant email processing via webhooks
- Immediate SMS alerts for urgent items
- No delays waiting for polling cycles

### Smart Matching
- AI matches events to specific children
- Considers parenting schedules for notifications
- Filters irrelevant events automatically

### Scalable Design
- Webhook-based system handles high volume
- Database efficiently stores email history
- SMS service prevents spam with rate limiting

### Parent-Friendly
- No app downloads required
- Works with existing email habits
- SMS works on any phone

This system transforms chaotic school email communication into organized, actionable notifications that respect custody schedules and reduce parental stress.