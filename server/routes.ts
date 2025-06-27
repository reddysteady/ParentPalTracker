import express, { Router, Request, Response } from 'express';
import { db } from './db';
import { users, children, emails, events, notifications } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { createGmailService } from './gmail-service';
import { processIncomingEmail } from './email-service';
import { storage } from './storage';

const router = Router();

// Clean router setup

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
    
    // Check if user already exists by email
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      console.log('User already exists:', existingUser[0]);
      return res.json(existingUser[0]); // Return existing user instead of error
    }
    
    const newUser = await db.insert(users).values({
      email,
      name,
      customEmailAddress,
      phoneNumber
    }).returning();
    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
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
router.get('/api/emails', async (req, res) => {
  try {
    const allEmails = await db.select().from(emails);
    res.json(allEmails);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

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
router.get('/api/debug/oauth', (req: Request, res: Response) => {
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
    });
  }
});

// Get emails for a specific user
router.get('/api/emails/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const userEmails = await db.select()
      .from(emails)
      .where(eq(emails.userId, userId))
      .limit(limit)
      .offset(offset);

    res.json(userEmails);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Delete email from view (not from Gmail)
router.delete('/api/emails/:emailId', async (req, res) => {
  try {
    const emailId = parseInt(req.params.emailId);

    await db.delete(emails).where(eq(emails.id, emailId));

    res.json({ success: true, message: 'Email removed from view' });
  } catch (error) {
    console.error('Error deleting email:', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

// Gmail OAuth endpoints
router.get('/api/auth/google', async (req, res) => {
  try {
    const gmailService = createGmailService();
    const authUrl = gmailService.getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

router.get('/api/auth/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  try {
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    console.log('Starting token exchange with code:', code ? 'Present' : 'Missing');

    const gmailService = createGmailService();
    const tokens = await gmailService.getTokens(code as string);

    console.log('Token exchange successful, tokens received:', !!tokens);

    // In a real app, you'd store these tokens securely in the database
    // For now, we'll return them to be stored in localStorage
    const tokensJson = JSON.stringify(tokens).replace(/'/g, "\\'");

    res.send(`
      <script>
        console.log('OAuth callback page loaded');

        try {
          const tokens = ${tokensJson};
          console.log('Tokens received:', !!tokens);

          // Notify parent window about successful connection and pass tokens
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'gmail-connected', 
              tokens: tokens 
            }, '*');
            console.log('Notified parent window with tokens');
          }

          // Show success message before closing
          document.body.innerHTML = '<div style="font-family: Arial; text-align: center; padding: 50px; background: #f0f8ff;"><h2 style="color: #28a745;">Gmail Connected Successfully!</h2><p>Closing window...</p></div>';
          console.log('Success message displayed');

          // Close window after notification
          setTimeout(() => {
            console.log('Closing window');
            window.close();
          }, 500);

        } catch (error) {
          console.error('Error in OAuth callback script:', error);
          document.body.innerHTML = '<div style="font-family: Arial; text-align: center; padding: 50px; background: #fff3cd;"><h2 style="color: #856404;">OAuth Warning</h2><p>Connection successful but there was an issue storing tokens.</p><p>Please check the console and try again.</p></div>';
        }
      </script>
    `);
  } catch (error: any) {
    console.error('Error exchanging code for tokens:', error);
    console.error('OAuth Configuration Debug:', {
      clientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 30) + '...',
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      receivedCode: !!code,
      codeValue: code ? String(code).substring(0, 20) + '...' : 'NONE',
      errorMessage: error.message,
      errorStack: error.stack
    });

    const errorMsg = (error.message || 'Unknown error').replace(/'/g, "\\'");
    const isInvalidGrant = error.message?.includes('invalid_grant');

    res.send(`
      <script>
        console.error('OAuth Error Details:', '${errorMsg}');

        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'font-family: Arial; text-align: center; padding: 50px; background: #fff3cd; border: 1px solid #ffeaa7; max-width: 600px; margin: 50px auto; border-radius: 8px;';

        ${isInvalidGrant ? `
          errorDiv.innerHTML = \`
            <h2 style="color: #856404;">OAuth Configuration Issue</h2>
            <p><strong>Invalid Grant Error</strong></p>
            <p>This usually means there's a mismatch in the OAuth configuration.</p>
            <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 4px; text-align: left;">
              <h4>Possible solutions:</h4>
              <ul style="text-align: left; margin: 10px 0;">
                <li>Check that the redirect URI in Google Console exactly matches:<br>
                    <code style="background: #e9ecef; padding: 2px 4px; word-break: break-all;">${process.env.GOOGLE_REDIRECT_URI}</code></li>
                <li>Ensure the OAuth client ID and secret are correct</li>
                <li>Try the OAuth flow again (codes expire quickly)</li>
              </ul>
            </div>
            <p style="font-size: 12px; color: #666;">Error: ${errorMsg}</p>
            <button onclick="window.close()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Close Window</button>
          \`;
        ` : `
          errorDiv.innerHTML = \`
            <h2 style="color: #856404;">OAuth Error</h2>
            <p>Failed to exchange authorization code</p>
            <p style="font-size: 12px; color: #666;">Error: ${errorMsg}</p>
            <button onclick="window.close()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Close Window</button>
          \`;
        `}

        document.body.appendChild(errorDiv);

        // Notify parent window about the error
        if (window.opener) {
          window.opener.postMessage('gmail-error', '*');
        }
      </script>
    `);
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

    console.log('📧 Gmail sync request for user:', userId);
    console.log('📧 Tokens provided:', !!tokens);

    if (!tokens || !tokens.access_token) {
      console.log('❌ No valid Gmail tokens provided');
      return res.status(400).json({ error: 'Valid Gmail tokens required - please connect Gmail first' });
    }

    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.log('❌ Missing Gmail OAuth credentials');
      return res.status(500).json({ error: 'Gmail integration not configured - missing credentials' });
    }

    console.log('📧 Creating Gmail service...');
    const gmailService = createGmailService();
    
    // Set tokens and validate them
    gmailService.setTokens(tokens);

    console.log('📧 Processing unread emails...');
    // Process unread emails using actual Gmail service
    const result = await gmailService.processUnreadEmails(userId);

    console.log('📧 Gmail sync completed:', result);

    res.json({ 
      success: true, 
      processed: result.processed,
      errors: result.errors,
      message: `Processed ${result.processed} emails${result.errors > 0 ? `, ${result.errors} errors` : ''}`
    });
  } catch (error: any) {
    console.error('❌ Error syncing Gmail:', error);
    
    // Check if error is due to token expiration or authentication issues
    if (error.message?.includes('invalid_grant') || 
        error.message?.includes('Token has been expired') ||
        error.message?.includes('authentication failed') ||
        error.code === 401) {
      res.status(401).json({ 
        error: 'Gmail authentication failed - please reconnect your Gmail account',
        expired: true
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to sync Gmail: ' + error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
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

// Get user domains
router.get('/api/users/:userId/domains', async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ schoolDomains: user.schoolDomains || [] });
  } catch (error) {
    console.error('Error getting user domains:', error);
    res.status(500).json({ error: 'Failed to get user domains' });
  }
});

// Add domain
router.post('/api/users/:userId/domains', async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { domain } = req.body;
    
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add domain to array (avoid duplicates)
    const currentDomains = user.schoolDomains || [];
    if (!currentDomains.includes(domain)) {
      const updatedDomains = [...currentDomains, domain];
      await storage.updateUser(userId, { schoolDomains: updatedDomains });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding domain:', error);
    res.status(500).json({ error: 'Failed to add domain' });
  }
});

// Remove domain
router.delete('/api/users/:userId/domains', async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { domain } = req.body;
    
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove domain from array
    const currentDomains = user.schoolDomains || [];
    const updatedDomains = currentDomains.filter(d => d !== domain);
    await storage.updateUser(userId, { schoolDomains: updatedDomains });

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing domain:', error);
    res.status(500).json({ error: 'Failed to remove domain' });
  }
});

// Get user stats
router.get('/api/users/:userId/stats', async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const emails = await storage.getEmailsByUserId(userId);
    const events = await storage.getEventsByUserId(userId);
    
    const stats = {
      emailsProcessed: emails.length,
      eventsExtracted: events.length,
      lastSync: emails.length > 0 ? emails[emails.length - 1].receivedAt.toLocaleDateString() : 'Never'
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

export default router;