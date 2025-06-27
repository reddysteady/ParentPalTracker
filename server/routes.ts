import { Router } from 'express';
import { db } from './db';
import { users, children, emails, events } from '../shared/schema';

const router = Router();

// Health check
router.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User routes
router.get('/api/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/api/users', async (req, res) => {
  try {
    const newUser = await db.insert(users).values(req.body).returning();
    res.json(newUser[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Children routes
router.get('/api/children', async (req, res) => {
  try {
    const allChildren = await db.select().from(children);
    res.json(allChildren);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

router.post('/api/children', async (req, res) => {
  try {
    const newChild = await db.insert(children).values(req.body).returning();
    res.json(newChild[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create child' });
  }
});

// Email routes
router.post('/api/emails', async (req, res) => {
  try {
    const newEmail = await db.insert(emails).values(req.body).returning();
    res.json(newEmail[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to store email' });
  }
});

// Events routes
router.get('/api/events', async (req, res) => {
  try {
    const allEvents = await db.select().from(events);
    res.json(allEvents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Gmail OAuth flow endpoints
router.get('/api/auth/google', async (req, res) => {
  try {
    console.log('📧 Starting Gmail OAuth flow...');
    console.log('Environment check:', {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
      clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      actualClientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
      actualSecret: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING'
    });

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('❌ Missing OAuth credentials');
      return res.status(500).json({ 
        error: 'Missing OAuth credentials', 
        details: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set in environment' 
      });
    }

    const { createGmailService } = await import('./gmail-service');
    const gmailService = createGmailService();
    const authUrl = gmailService.getAuthUrl();
    
    console.log('Generated auth URL length:', authUrl.length);
    console.log('Auth URL domain:', authUrl.substring(0, 50) + '...');
    res.redirect(authUrl);
  } catch (error) {
    console.error('❌ Failed to initiate Gmail OAuth:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to initiate Gmail OAuth', details: error.message });
  }
});

router.get('/api/auth/google/callback', async (req, res) => {
  try {
    console.log('📧 Gmail OAuth callback received');
    console.log('Query params:', req.query);
    
    const { code, error, error_description } = req.query;
    
    if (error) {
      console.error('❌ OAuth error from Google:', { error, error_description });
      return res.redirect(`/?error=google_oauth_error&details=${encodeURIComponent(error_description || error)}`);
    }
    
    if (!code) {
      console.error('❌ No authorization code received');
      return res.redirect('/?error=no_code');
    }

    console.log('✅ Authorization code received, exchanging for tokens...');
    const { createGmailService } = await import('./gmail-service');
    const gmailService = createGmailService();
    const tokens = await gmailService.getTokens(code as string);

    console.log('✅ Tokens received successfully');
    // In production, store these tokens securely in the database linked to user
    // For now, redirect back to frontend with tokens in URL (temporary solution)
    const tokensParam = encodeURIComponent(JSON.stringify(tokens));
    res.redirect(`/?tokens=${tokensParam}`);
  } catch (error) {
    console.error('❌ Gmail OAuth callback error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.redirect(`/?error=oauth_failed&details=${encodeURIComponent(error.message)}`);
  }
});

// Gmail integration setup
router.post('/api/gmail/setup', async (req, res) => {
  try {
    const { userId, tokens } = req.body;

    if (!tokens || !userId) {
      return res.status(400).json({ error: 'Missing tokens or userId' });
    }

    // In production, store encrypted tokens in database
    // For now, just validate and return success
    res.json({ success: true, message: 'Gmail integration configured' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to setup Gmail integration' });
  }
});

// Manual Gmail sync endpoint
router.post('/api/gmail/sync/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { tokens } = req.body;

    if (!tokens) {
      return res.status(400).json({ error: 'Gmail tokens required for sync' });
    }

    const { createGmailService } = await import('./gmail-service');
    const gmailService = createGmailService();
    gmailService.setTokens(tokens);

    const result = await gmailService.processUnreadEmails(parseInt(userId));

    res.json({ 
      success: true, 
      message: `Gmail sync completed: ${result.processed} emails processed`,
      processed: result.processed,
      errors: result.errors
    });
  } catch (error) {
    console.error('Gmail sync error:', error);
    res.status(500).json({ error: 'Failed to sync Gmail' });
  }
});

// Start Gmail monitoring for a user
router.post('/api/gmail/monitor/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { tokens, intervalMinutes = 5 } = req.body;

    if (!tokens) {
      return res.status(400).json({ error: 'Gmail tokens required for monitoring' });
    }

    const { createGmailService } = await import('./gmail-service');
    const gmailService = createGmailService();
    gmailService.setTokens(tokens);
    gmailService.startEmailMonitoring(parseInt(userId), intervalMinutes);

    res.json({ 
      success: true, 
      message: `Gmail monitoring started for user ${userId}`,
      interval: `${intervalMinutes} minutes`
    });
  } catch (error) {
    console.error('Gmail monitoring error:', error);
    res.status(500).json({ error: 'Failed to start Gmail monitoring' });
  }
});

export default router;