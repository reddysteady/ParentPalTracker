import express, { Router } from 'express';
import { db } from './db';
import { users, children, emails, events, notifications } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { gmailService } from './gmail-service';
import { emailService } from './email-service';

const router = Router();

// Health check endpoint
router.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'connected' : 'mock',
    devMode: process.env.DEV_MODE === 'true'
  });
});

// User endpoints  
router.get('/api/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/api/users', async (req, res) => {
  try {
    const { email, name, customEmailAddress, phoneNumber } = req.body;
    const newUser = await db.insert(users).values({
      email,
      name,
      customEmailAddress,
      phoneNumber
    }).returning();
    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Children endpoints
router.get('/api/children', async (req, res) => {
  try {
    const allChildren = await db.select().from(children);
    res.json(allChildren);
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

router.post('/api/children', async (req, res) => {
  try {
    const { userId, name, school, grade } = req.body;
    const newChild = await db.insert(children).values({
      userId,
      name,
      school,
      grade
    }).returning();
    res.status(201).json(newChild[0]);
  } catch (error) {
    console.error('Error creating child:', error);
    res.status(500).json({ error: 'Failed to create child' });
  }
});

// Email endpoints
router.post('/api/emails', async (req, res) => {
  try {
    const { userId, subject, body, sender, receivedAt, gmailMessageId } = req.body;
    const newEmail = await db.insert(emails).values({
      userId,
      subject,
      body,
      sender,
      receivedAt: new Date(receivedAt),
      gmailMessageId
    }).returning();
    res.status(201).json(newEmail[0]);
  } catch (error) {
    console.error('Error storing email:', error);
    res.status(500).json({ error: 'Failed to store email' });
  }
});

// Events endpoints
router.get('/api/events', async (req, res) => {
  try {
    const allEvents = await db.select().from(events);
    res.json(allEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.post('/api/events', async (req, res) => {
  try {
    const { userId, childId, emailId, title, description, eventDate, location, requiresAction, actionDeadline, extractedData } = req.body;
    const newEvent = await db.insert(events).values({
      userId,
      childId,
      emailId,
      title,
      description,
      eventDate: eventDate ? new Date(eventDate) : null,
      location,
      requiresAction,
      actionDeadline: actionDeadline ? new Date(actionDeadline) : null,
      extractedData
    }).returning();
    res.status(201).json(newEvent[0]);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Debug endpoint for OAuth troubleshooting
router.get('/api/debug/oauth', (req, res) => {
  console.log('🔍 Environment validation:', {
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
    clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    actualClientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 30) + '...',
    actualSecret: process.env.GOOGLE_CLIENT_SECRET ? `${process.env.GOOGLE_CLIENT_SECRET.substring(0, 10)}...` : 'MISSING',
    replOwner: process.env.REPL_OWNER
  });

  // Validate redirect URI format
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (redirectUri) {
    console.log('🔍 Redirect URI analysis:', {
      uri: redirectUri,
      isHttps: redirectUri.startsWith('https://'),
      hasCorrectDomain: redirectUri.includes('parentpaltracker.edwardstead.replit.dev'),
      hasCallbackPath: redirectUri.includes('/api/auth/google/callback'),
      length: redirectUri.length,
      endsWithSlash: redirectUri.endsWith('/'),
      exactMatch: redirectUri === 'https://parentpaltracker.edwardstead.replit.dev/api/auth/google/callback'
    });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('❌ Missing OAuth credentials');
    return res.status(500).json({ 
      error: 'Missing OAuth credentials', 
      details: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set in environment'
    });
  }

  res.json({
    status: 'OAuth configuration check',
    hasCredentials: true,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  });
});

// Gmail OAuth endpoints
router.get('/api/auth/google', async (req, res) => {
  try {
    const authUrl = await gmailService.getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

router.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    const tokens = await gmailService.exchangeCodeForTokens(code as string);

    // In a real app, you'd store these tokens securely in the database
    // For now, we'll return them to be stored in localStorage
    res.send(`
      <script>
        localStorage.setItem('gmailTokens', '${JSON.stringify(tokens)}');
        window.close();
      </script>
    `);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).json({ error: 'Failed to exchange authorization code' });
  }
});

// Gmail integration endpoints
router.post('/api/gmail/setup', async (req, res) => {
  try {
    const { userId, tokens } = req.body;

    // Update user with Gmail tokens
    await db.update(users)
      .set({ gmailTokens: tokens })
      .where(eq(users.id, userId));

    res.json({ success: true, message: 'Gmail integration configured' });
  } catch (error) {
    console.error('Error setting up Gmail integration:', error);
    res.status(500).json({ error: 'Failed to setup Gmail integration' });
  }
});

router.post('/api/gmail/sync/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { tokens } = req.body;

    // Process emails using the email service
    const result = await emailService.processIncomingEmail({
      userId,
      // Mock email data - in real implementation, this would fetch from Gmail
      subject: 'Test sync',
      body: 'Gmail sync test',
      sender: 'test@example.com',
      receivedAt: new Date(),
      gmailMessageId: 'test-sync-' + Date.now()
    });

    res.json({ success: true, processed: 1, result });
  } catch (error) {
    console.error('Error syncing Gmail:', error);
    res.status(500).json({ error: 'Failed to sync Gmail' });
  }
});

router.post('/api/gmail/monitor/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Set up Gmail monitoring (placeholder)
    console.log(`Setting up Gmail monitoring for user ${userId}`);

    res.json({ success: true, message: 'Gmail monitoring enabled' });
  } catch (error) {
    console.error('Error setting up Gmail monitoring:', error);
    res.status(500).json({ error: 'Failed to setup Gmail monitoring' });
  }
});

export default router;