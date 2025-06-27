import { storage } from './storage';
import { extractEventsFromEmail } from './nlp';
import { sendSMS, formatSMSMessage } from './sms-service';

/**
 * Email ingestion service for ParentPal
 * 
 * In production, this would integrate with:
 * 1. Email forwarding service (like AWS SES, SendGrid, or Mailgun)
 * 2. IMAP/POP3 for polling custom email accounts
 * 3. Webhook endpoints for real-time email delivery
 */

export interface IncomingEmail {
  to: string; // The custom forwarding address (e.g., ed@parentpal.app)
  from: string; // School email address
  subject: string;
  body: string;
  receivedAt: Date;
}

/**
 * Process incoming forwarded emails
 * This would be called by webhook from email service or IMAP polling
 */
export async function processIncomingEmail(incomingEmail: IncomingEmail) {
  try {
    // Extract user ID from custom email address
    // e.g., ed@parentpal.app -> find user with customEmailAddress = "ed@parentpal.app"
    const users = await storage.getAllUsers(); // We need to add this method
    
    // Look up user by the TO address (custom forwarding address)
    // The email was sent TO the user's custom address, not FROM their address
    let user = users.find(u => u.customEmailAddress === incomingEmail.to);

    // If no custom email address, try matching primary email as fallback
    if (!user) {
      user = users.find(u => u.email === incomingEmail.to);
    }

    if (!user) {
      console.error(`No user found for recipient address: ${incomingEmail.to}`);
      console.log(`Email was sent FROM: ${incomingEmail.from} TO: ${incomingEmail.to}`);
      return { success: false, error: 'User not found for recipient address' };
    }

    // Store the raw email
    const email = await storage.createEmail({
      userId: user.id,
      subject: incomingEmail.subject,
      body: incomingEmail.body,
      sender: incomingEmail.from,
      processed: false,
    });

    console.log(`Email stored for user ${user.name}: ${incomingEmail.subject}`);

    // Extract events using OpenAI
    const extractedEvents = await extractEventsFromEmail(incomingEmail.subject, incomingEmail.body);

    const createdEvents = [];
    for (const extractedEvent of extractedEvents) {
      // Try to match child by name
      let childId: number | undefined = undefined;
      if (extractedEvent.childName) {
        const children = await storage.getChildrenByUserId(user.id);
        const matchedChild = children.find(child => 
          child.name.toLowerCase().includes(extractedEvent.childName!.toLowerCase())
        );
        childId = matchedChild?.id;
      }

      const eventData = {
        userId: user.id,
        emailId: email.id,
        childId: childId || null,
        title: extractedEvent.title,
        description: extractedEvent.description,
        eventDate: new Date(extractedEvent.eventDate),
        preparation: extractedEvent.preparation,
        isCanceled: extractedEvent.isCanceled,
        isCompleted: false,
      };

      const event = await storage.createEvent(eventData);
      createdEvents.push(event);

      console.log(`Event created: ${event.title} for ${new Date(event.eventDate).toDateString()}`);
    }

    // Mark email as processed
    await storage.markEmailAsProcessed(email.id);

    // Generate notifications for new events
    for (const event of createdEvents) {
      await generateEventNotifications(user.id, event as any);
    }

    return { 
      success: true, 
      emailId: email.id, 
      eventsCreated: createdEvents.length,
      events: createdEvents 
    };

  } catch (error) {
    console.error('Error processing incoming email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate notifications for a new event
 */
async function generateEventNotifications(userId: number, event: any): Promise<void> {
  const eventDate = new Date(event.eventDate);
  const now = new Date();
  const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Only generate notifications for future events
  if (daysUntilEvent < 0) return;

  // Check if user is responsible for this event
  let isUserResponsible = true; // Default to true if no child/schedule specified

  if (event.childId) {
    isUserResponsible = await storage.getUserResponsibilityForDate(userId, event.childId, eventDate);
  }

  // Generate notification message
  const child = event.childId ? await storage.getChild(event.childId) : null;
  const message = `${child?.name || 'Your child'}'s ${event.title} on ${eventDate.toDateString()}${event.preparation ? ` - ${event.preparation}` : ''}`;

  // Create notification record
  await storage.createNotification({
    userId,
    eventId: event.id,
    type: isUserResponsible ? 'sms' : 'email',
    message,
    delivered: false,
  });

  // For immediate events (within 2 days), send SMS if enabled
  if (daysUntilEvent <= 2 && isUserResponsible) {
    const user = await storage.getUser(userId);
    if (user?.smsEnabled && user.smsPhone) {
      await sendSMSNotification(user.smsPhone, message);
    }
  }
}

/**
 * Send SMS notification using the SMS service
 */
async function sendSMSNotification(phoneNumber: string, message: string) {
  const result = await sendSMS({
    to: phoneNumber,
    message: message
  });

  if (!result.success) {
    console.error(`Failed to send SMS to ${phoneNumber}: ${result.error}`);
  }

  return result;
}

/**
 * Email polling service - would run as a cron job
 * This simulates checking for new emails every few minutes
 */
export class EmailPollingService {
  private isPolling = false;
  private pollInterval = 5 * 60 * 1000; // 5 minutes

  start() {
    if (this.isPolling) return;

    this.isPolling = true;
    console.log('Email polling service started');

    // Set up polling interval
    setInterval(() => {
      this.pollForNewEmails();
    }, this.pollInterval);
  }

  stop() {
    this.isPolling = false;
    console.log('Email polling service stopped');
  }

  private async pollForNewEmails() {
    console.log('Polling for new emails...');

    // In production, this would:
    // 1. Connect to IMAP/POP3 server
    // 2. Check for new emails in inbox
    // 3. Process each new email
    // 4. Mark emails as read/delete them

    // For now, just log that polling occurred
    console.log('Email polling completed');
  }
}

/**
 * Webhook endpoint for real-time email delivery
 * This would be called by services like SendGrid, Mailgun, etc.
 */
export function createEmailWebhookHandler() {
  return async (req: any, res: any) => {
    try {
      // Parse webhook payload (format varies by provider)
      const emailData = parseEmailWebhook(req.body);

      const result = await processIncomingEmail(emailData);

      if (result.success) {
        res.status(200).json({ 
          message: 'Email processed successfully',
          eventsCreated: result.eventsCreated 
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Parse incoming webhook data into standardized format
 */
function parseEmailWebhook(webhookData: any): IncomingEmail {
  // This would vary based on email service provider
  // Example for SendGrid webhook format:
  return {
    to: webhookData.to || '',
    from: webhookData.from || '',
    subject: webhookData.subject || '',
    body: webhookData.text || webhookData.html || '',
    receivedAt: new Date(webhookData.timestamp || Date.now())
  };
}