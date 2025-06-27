
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
   * Search for unread school emails using Gmail filters
   */
  async searchSchoolEmails(query: string = 'is:unread from:(*@*.edu OR *@*.k12.* OR *@school*)'): Promise<any[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 20
      });

      if (!response.data.messages) {
        return [];
      }

      // Get full message details for each email
      const emails = await Promise.all(
        response.data.messages.map(async (message: any) => {
          const fullMessage = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });
          return this.parseGmailMessage(fullMessage.data);
        })
      );

      return emails.filter(email => email !== null);
    } catch (error) {
      console.error('Error searching Gmail:', error);
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
        receivedAt: new Date(date || Date.now())
      };
    } catch (error) {
      console.error('Error parsing Gmail message:', error);
      return null;
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
    try {
      const emails = await this.searchSchoolEmails();
      let processed = 0;
      let errors = 0;

      for (const email of emails) {
        try {
          const result = await processIncomingEmail(email);
          if (result.success) {
            processed++;
            console.log(`Processed email: ${email.subject}`);
          } else {
            errors++;
            console.error(`Failed to process email: ${email.subject}`, result.error);
          }
        } catch (error) {
          errors++;
          console.error('Error processing email:', error);
        }
      }

      return { processed, errors };
    } catch (error) {
      console.error('Error processing unread emails:', error);
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
