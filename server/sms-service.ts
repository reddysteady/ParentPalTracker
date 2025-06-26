/**
 * SMS Notification Service for ParentPal
 * 
 * This service handles sending SMS notifications to parents using Twilio.
 * For production use, you'll need to:
 * 1. Sign up for Twilio account
 * 2. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER as secrets
 * 3. Verify parent phone numbers (required by Twilio for trial accounts)
 */

export interface SMSMessage {
  to: string;      // Parent's phone number
  message: string; // Notification text
  eventId?: number; // Associated event ID for tracking
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS notification to parent
 */
export async function sendSMS(smsData: SMSMessage): Promise<SMSResult> {
  try {
    // For development/testing - just log the message
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log(`📱 SMS would be sent to ${smsData.to}: ${smsData.message}`);
      return { 
        success: true, 
        messageId: `mock_${Date.now()}`,
      };
    }

    // Production Twilio integration
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const message = await client.messages.create({
      body: smsData.message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: smsData.to
    });

    console.log(`✅ SMS sent successfully to ${smsData.to} (Message ID: ${message.sid})`);

    return {
      success: true,
      messageId: message.sid
    };

  } catch (error) {
    console.error(`❌ Failed to send SMS to ${smsData.to}:`, error);
    
    return {
      success: false,
      error: error.message || 'Unknown SMS error'
    };
  }
}

/**
 * Send batch SMS notifications
 */
export async function sendBatchSMS(messages: SMSMessage[]): Promise<SMSResult[]> {
  const results: SMSResult[] = [];
  
  for (const message of messages) {
    const result = await sendSMS(message);
    results.push(result);
    
    // Add small delay to avoid rate limiting
    if (messages.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * Format notification message for SMS (keep under 160 characters)
 */
export function formatSMSMessage(
  childName: string,
  eventTitle: string,
  eventDate: Date,
  preparation?: string
): string {
  const dateStr = eventDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  
  let message = `${childName}'s ${eventTitle} on ${dateStr}`;
  
  if (preparation && message.length + preparation.length < 140) {
    message += ` - ${preparation}`;
  }
  
  return message;
}

/**
 * Generate different types of SMS notifications
 */
export class SMSNotificationGenerator {
  
  static reminderNotification(childName: string, eventTitle: string, eventDate: Date): string {
    const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil === 0) {
      return `Today: ${childName}'s ${eventTitle}`;
    } else if (daysUntil === 1) {
      return `Tomorrow: ${childName}'s ${eventTitle}`;
    } else {
      return `In ${daysUntil} days: ${childName}'s ${eventTitle}`;
    }
  }
  
  static preparationReminder(childName: string, eventTitle: string, preparation: string): string {
    return `Prep needed for ${childName}'s ${eventTitle}: ${preparation}`;
  }
  
  static cancellationNotice(childName: string, eventTitle: string): string {
    return `CANCELED: ${childName}'s ${eventTitle}`;
  }
  
  static lastMinuteReminder(childName: string, eventTitle: string, timeUntil: string): string {
    return `URGENT: ${childName}'s ${eventTitle} in ${timeUntil}`;
  }
}

/**
 * SMS service configuration
 */
export const SMS_CONFIG = {
  // Maximum message length for SMS
  MAX_LENGTH: 160,
  
  // Rate limiting - messages per minute
  RATE_LIMIT: 10,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Phone number validation regex (basic US format)
  PHONE_REGEX: /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/
};

/**
 * Validate and format phone number
 */
export function validateAndFormatPhone(phone: string): { valid: boolean; formatted?: string; error?: string } {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check length and format
  if (cleaned.length === 10) {
    return { valid: true, formatted: `+1${cleaned}` };
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return { valid: true, formatted: `+${cleaned}` };
  } else {
    return { 
      valid: false, 
      error: 'Phone number must be 10 digits (US format)' 
    };
  }
}