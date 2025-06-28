import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { processIncomingEmail, IncomingEmail } from './email-service';

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class GmailIntegration {
  private oauth2Client: OAuth2Client;
  private gmail: any;
  private config: GmailConfig;

  constructor(config: GmailConfig) {
    this.config = config;
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    console.log('🔍 OAuth2Client configuration:', {
      clientId: this.oauth2Client._clientId?.substring(0, 30) + '...',
      clientSecret: this.oauth2Client._clientSecret ? 'SET' : 'MISSING',
      redirectUri: this.config.redirectUri
    });

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    console.log('🔍 Generated auth URL components:', {
      fullUrl: authUrl,
      clientIdParam: authUrl.match(/client_id=([^&]+)/)?.[1]?.substring(0, 30) + '...',
      redirectUriParam: authUrl.match(/redirect_uri=([^&]+)/)?.[1] ? decodeURIComponent(authUrl.match(/redirect_uri=([^&]+)/)?.[1] || '') : 'NOT_FOUND',
      scopeParam: authUrl.match(/scope=([^&]+)/)?.[1] ? decodeURIComponent(authUrl.match(/scope=([^&]+)/)?.[1] || '') : 'NOT_FOUND'
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    return tokens;
  }

  /**
   * Set stored tokens for authenticated user
   */
  setTokens(tokens: any) {
    this.oauth2Client.setCredentials(tokens);

    // Set up automatic token refresh
    this.oauth2Client.on('tokens', (newTokens) => {
      if (newTokens.refresh_token) {
        // In production, save the new refresh token to database
        console.log('🔄 New refresh token received');
      }
      if (newTokens.access_token) {
        console.log('🔄 Access token refreshed automatically');
        // In production, save the new access token to database
      }
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Refresh expired access token using refresh token
   */
  async refreshTokens(): Promise<any> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      return credentials;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Failed to refresh access token. Please re-authenticate.');
    }
  }

  /**
   * Search for unread school emails using Gmail filters
   */
  async searchSchoolEmails(userId?: number, query?: string): Promise<any[]> {
    // Build domain-specific query if userId provided
    if (userId && !query) {
      const { storage } = await import('./storage');
      const user = await storage.getUser(userId);

      if (user?.schoolDomains && user.schoolDomains.length > 0) {
        // Build query for specific domains
        const domainQueries = user.schoolDomains.map(domain => `from:*@${domain}`).join(' OR ');
        query = `is:unread (${domainQueries})`;
        console.log(`Searching emails from configured domains: ${user.schoolDomains.join(', ')}`);
      } else {
        // Default query for common school domains
        query = 'is:unread from:(*@*.edu OR *@*.k12.* OR *@school*)';
        console.log('No domains configured, using default school email patterns');
      }
    } else if (!query) {
      // Fallback to default
      query = 'is:unread from:(*@*.edu OR *@*.k12.* OR *@school*)';
    }
    try {
      console.log('📧 [Gmail API] Initializing Gmail API connection...');
      console.log('📧 [Gmail API] Auth client configured:', {
        hasGmailService: !!this.gmail,
        hasOAuth2Client: !!this.oauth2Client
      });

      let response;
      try {
        console.log('📧 [Gmail API] Making initial API call to list messages...');
        console.log('📧 [Gmail API] Request parameters:', {
          userId: 'me',
          query: query,
          maxResults: 20
        });

        response = await this.gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 20
        });

        console.log('📧 [Gmail API] Initial API call successful');
        console.log('📧 [Gmail API] Response summary:', {
          hasMessages: !!response.data.messages,
          messageCount: response.data.messages?.length || 0,
          resultSizeEstimate: response.data.resultSizeEstimate
        });

      } catch (authError: any) {
        console.log('❌ [Gmail API] Authentication error on initial call:', {
          code: authError.code,
          message: authError.message,
          status: authError.status
        });

        if (authError.code === 401 || authError.message?.includes('invalid authentication')) {
          console.log('🔄 [Gmail API] Access token expired, attempting refresh...');
          await this.refreshTokens();
          console.log('🔄 [Gmail API] Token refreshed, retrying API call...');

          // Retry the request with refreshed tokens
          response = await this.gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: 20
          });

          console.log('✅ [Gmail API] Retry successful after token refresh');
        } else {
          throw authError;
        }
      }

      if (!response.data.messages) {
        console.log('📧 [Gmail API] No messages found matching query');
        return [];
      }

      console.log(`📧 [Gmail API] Found ${response.data.messages.length} messages, fetching details...`);

      // Get full message details for each email
      const emails = await Promise.all(
        response.data.messages.map(async (message: any, index: number) => {
          console.log(`📧 [Gmail API] Fetching details for message ${index + 1}/${response.data.messages.length} (ID: ${message.id})`);

          let fullMessage;
          try {
            fullMessage = await this.gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'full'
            });

            console.log(`📧 [Gmail API] Successfully fetched message ${index + 1} details`);

          } catch (authError: any) {
            console.log(`❌ [Gmail API] Auth error fetching message ${index + 1}:`, {
              code: authError.code,
              message: authError.message
            });

            if (authError.code === 401 || authError.message?.includes('invalid authentication')) {
              console.log(`🔄 [Gmail API] Token expired, refreshing for message ${index + 1} retrieval...`);
              await this.refreshTokens();

              fullMessage = await this.gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'full'
              });

              console.log(`✅ [Gmail API] Successfully fetched message ${index + 1} after token refresh`);
            } else {
              throw authError;
            }
          }

          const parsedEmail = this.parseGmailMessage(fullMessage.data);
          console.log(`📧 [Gmail API] Parsed message ${index + 1}:`, {
            hasEmail: !!parsedEmail,
            subject: parsedEmail?.subject?.substring(0, 50) + '...',
            from: parsedEmail?.from,
            bodyLength: parsedEmail?.body?.length || 0
          });

          return parsedEmail;
        })
      );

      const validEmails = emails.filter(email => email !== null);
      console.log(`📧 [Gmail API] Processing complete: ${validEmails.length}/${emails.length} emails successfully parsed`);

      return validEmails;
    } catch (error: any) {
      console.error('❌ Error searching Gmail:', {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.response?.data
      });

      // Check for common authentication errors
      if (error.code === 401 || error.message?.includes('invalid_grant') || error.message?.includes('unauthorized')) {
        throw new Error('Gmail authentication failed - tokens may be expired or invalid');
      }

      throw error;
    }
  }

  /**
   * Parse Gmail message into standardized format
   */
  private parseGmailMessage(message: any): IncomingEmail | null {
    try {
      const headers = message.payload.headers;
      const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('subject');
      const from = getHeader('from');
      const to = getHeader('to');
      const date = getHeader('date');

      // Extract email body
      let body = '';
      if (message.payload.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString();
      } else if (message.payload.parts) {
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body += Buffer.from(part.body.data, 'base64').toString();
          }
        }
      }

      return {
        to: to,
        from: from,
        subject: subject,
        body: body,
        receivedAt: new Date(date || Date.now()),
        messageId: message.id
      };
    } catch (error) {
      console.error('Error parsing Gmail message:', error);
      return null;
    }
  }

  /**
   * Process a Gmail email for the specified user
   */
  async processGmailEmail(userId: number, email: IncomingEmail): Promise<{ success: boolean; error?: string }> {
    try {
      const { storage } = await import('./storage');
      const { extractEventsFromEmail } = await import('./nlp');

      // Store the raw email
      const storedEmail = await storage.createEmail({
        userId: userId,
        subject: email.subject,
        body: email.body,
        sender: email.from,
        receivedAt: email.receivedAt,
        gmailMessageId: email.messageId,
      });

      console.log(`Gmail email stored for user ${userId}: ${email.subject}`);

      // Extract events using OpenAI
      const extractedEvents = await extractEventsFromEmail(email.subject, email.body);

      const createdEvents = [];
      for (const extractedEvent of extractedEvents) {
        // Try to match child by name
        let childId: number | undefined = undefined;
        if (extractedEvent.childName) {
          const children = await storage.getChildrenByUserId(userId);
          const matchedChild = children.find(child => 
            child.name.toLowerCase().includes(extractedEvent.childName!.toLowerCase())
          );
          childId = matchedChild?.id;
        }

        const eventData = {
          userId: userId,
          emailId: storedEmail.id,
          childId: childId || null,
          title: extractedEvent.title,
          description: extractedEvent.description,
          eventDate: extractedEvent.eventDate ? new Date(extractedEvent.eventDate) : null,
          location: extractedEvent.location || null,
          requiresAction: extractedEvent.requiresAction || false,
          actionDeadline: extractedEvent.actionDeadline ? new Date(extractedEvent.actionDeadline) : null,
          extractedData: extractedEvent,
        };

        const event = await storage.createEvent(eventData);
        createdEvents.push(event);

        console.log(`Event created: ${event.title} for ${event.eventDate ? new Date(event.eventDate).toDateString() : 'No date'}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error processing Gmail email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark email as read after processing
   */
  async markAsRead(messageId: string) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  }

  /**
   * Process all unread school emails
   */
  async processUnreadEmails(userId: number): Promise<{ processed: number; errors: number }> {
  console.log(`🔄 [Gmail Service] Starting to process REAL Gmail emails for user ${userId}...`);

  try {
    // Get user's Gmail tokens
    const { storage } = await import('./storage');
    const user = await storage.getUser(userId);
    if (!user?.gmailTokens) {
      console.log(`❌ [Gmail Service] No Gmail tokens found for user ${userId}`);
      return { processed: 0, errors: 1 };
    }

    console.log(`✅ [Gmail Service] Found Gmail tokens for user ${userId}`, {
      hasAccessToken: !!(user.gmailTokens as any).access_token,
      hasRefreshToken: !!(user.gmailTokens as any).refresh_token,
      tokenScope: (user.gmailTokens as any).scope
    });

    // Set up OAuth2 client with user's tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials(user.gmailTokens as any);

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    console.log(`📡 [Gmail Service] Gmail API client initialized, fetching message list...`);

    // Fetch recent emails from Gmail
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20,
      q: 'is:unread OR newer_than:7d' // Get unread emails or emails from last 7 days
    });

    const messages = response.data.messages || [];
    console.log(`📬 [Gmail Service] Found ${messages.length} messages from Gmail API (REAL DATA)`);

    if (messages.length === 0) {
      console.log(`📭 [Gmail Service] No messages found in Gmail for user ${userId}`);
      return { processed: 0, errors: 0 };
    }

    let processed = 0;
    let errors = 0;

    // Process each message
    for (const message of messages) {
      try {
        console.log(`🔍 [Gmail Service] Fetching details for message ID: ${message.id}`);

        // Get full message details
        const messageDetails = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full'
        });

        const messageData = messageDetails.data;
        const headers = messageData.payload?.headers || [];

        // Extract email details from headers
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')?.value;
        const receivedAt = dateHeader ? new Date(dateHeader) : new Date();

        // Extract email body
        let body = '';
        if (messageData.payload?.body?.data) {
          body = Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8');
        } else if (messageData.payload?.parts) {
          // Handle multipart messages
          for (const part of messageData.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              body = Buffer.from(part.body.data, 'base64').toString('utf-8');
              break;
            }
          }
        }

        console.log(`📧 [Gmail Service] Processing REAL email:`, {
          messageId: message.id,
          subject: subject.substring(0, 50) + '...',
          from: from.substring(0, 30) + '...',
          bodyLength: body.length,
          receivedAt: receivedAt.toISOString(),
          isRealGmailData: true
        });

        // Check if email already exists to avoid duplicates
        const existingEmails = await (await import('./storage')).storage.getEmailsByUserId(userId);
        const emailExists = existingEmails.some(email => 
          email.gmailMessageId === message.id || 
          (email.subject === subject && email.sender === from)
        );

        if (emailExists) {
          console.log(`⏭️ [Gmail Service] Email already exists, skipping: ${subject.substring(0, 30)}...`);
          continue;
        }

        // Store the REAL email in database
        const { storage } = await import('./storage');
        await storage.createEmail({
          userId,
          subject,
          body: body.substring(0, 10000), // Limit body length
          sender: from,
          receivedAt,
          gmailMessageId: message.id!
        });

        processed++;
        console.log(`✅ [Gmail Service] Successfully stored REAL Gmail email ${processed}: ${subject.substring(0, 40)}...`);

      } catch (error: any) {
        console.error(`❌ [Gmail Service] Error processing message ${message.id}:`, {
          errorMessage: error.message,
          errorCode: error.code,
          isRateLimitError: error.code === 429,
          isAuthError: error.code === 401 || error.code === 403
        });
        errors++;
      }
    }

    console.log(`🎯 [Gmail Service] Real Gmail processing complete for user ${userId}:`, {
      processed,
      errors,
      totalAttempted: messages.length,
      successRate: messages.length > 0 ? Math.round((processed / messages.length) * 100) : 0,
      dataSource: 'Gmail API (Real Data)',
      isRealData: true
    });

    return { processed, errors };

  } catch (error: any) {
    console.error(`💥 [Gmail Service] Critical error processing REAL Gmail emails for user ${userId}:`, {
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: error.code,
      isRateLimitError: error.code === 429,
      isAuthError: error.code === 401 || error.code === 403,
      isQuotaError: error.message?.includes('quota')
    });
    return { processed: 0, errors: 1 };
  }
}

  /**
   * Set up automatic email monitoring
   */
  startEmailMonitoring(userId: number, intervalMinutes: number = 5) {
    const interval = intervalMinutes * 60 * 1000;

    console.log(`Starting Gmail monitoring for user ${userId} every ${intervalMinutes} minutes`);

    setInterval(async () => {
      try {
        const result = await this.processUnreadEmails(userId);
        if (result.processed > 0) {
          console.log(`Gmail sync: ${result.processed} emails processed, ${result.errors} errors`);
        }
      } catch (error) {
        console.error('Gmail monitoring error:', error);
      }
    }, interval);
  }
}

/**
 * Gmail service instance factory
 */
export function createGmailService(): GmailIntegration {
  const config = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:3000'}/api/auth/google/callback`
  };

  console.log('📧 Creating Gmail service with config:', {
    hasClientId: !!config.clientId,
    hasClientSecret: !!config.clientSecret,
    redirectUri: config.redirectUri,
    clientIdPreview: config.clientId ? `${config.clientId.substring(0, 10)}...` : 'MISSING'
  });

  if (!config.clientId || !config.clientSecret) {
    console.error('❌ Missing required Gmail OAuth credentials');
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables');
  }

  return new GmailIntegration(config);
}