import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ExtractedEvent {
  title: string;
  description?: string;
  eventDate: string; // ISO date string
  preparation?: string; // Required preparation (costumes, forms, money)
  isCanceled: boolean;
  childName?: string; // Which child this event is for
}

/**
 * Extract school events from email content using OpenAI GPT-4o
 */
export async function extractEventsFromEmail(
  subject: string,
  body: string
): Promise<ExtractedEvent[]> {
  try {
    const prompt = `
You are an expert at extracting school event information from emails. 
Analyze this school email and extract any events, activities, or important dates mentioned.

Email Subject: ${subject}
Email Body: ${body}

Please extract all events and return them as a JSON array. For each event, include:
- title: Brief descriptive name of the event
- description: More detailed description if available
- eventDate: Date in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
- preparation: Any required preparation (costumes, money, forms, items to bring)
- isCanceled: true if the event is canceled or postponed
- childName: Name of the child if specifically mentioned

Important notes:
- Only extract actual events/activities, not just informational content
- If no specific date is mentioned, try to infer from context clues
- If an event is canceled or changed, mark isCanceled as true
- Return empty array if no events are found
- Be conservative - only extract clear, actionable events

Respond with valid JSON only.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that extracts structured event data from school emails. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent extraction
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content);
    
    // Handle different response formats - sometimes it's wrapped in an "events" key
    const events = result.events || result;
    
    if (!Array.isArray(events)) {
      console.warn("OpenAI response is not an array:", result);
      return [];
    }

    // Validate and clean the extracted events
    return events
      .filter((event: any) => event.title && event.eventDate)
      .map((event: any) => ({
        title: String(event.title).trim(),
        description: event.description ? String(event.description).trim() : undefined,
        eventDate: String(event.eventDate).trim(),
        preparation: event.preparation ? String(event.preparation).trim() : undefined,
        isCanceled: Boolean(event.isCanceled),
        childName: event.childName ? String(event.childName).trim() : undefined,
      }));
  } catch (error) {
    console.error("Error extracting events from email:", error);
    throw new Error(`Failed to extract events: ${error.message}`);
  }
}

/**
 * Generate a smart notification message based on event and user's parenting schedule
 */
export async function generateNotificationMessage(
  eventTitle: string,
  eventDate: string,
  preparation: string | undefined,
  childName: string | undefined,
  isUserResponsible: boolean,
  daysUntilEvent: number
): Promise<string> {
  try {
    const prompt = `
Generate a helpful parent notification message for this school event:

Event: ${eventTitle}
Date: ${eventDate}
Child: ${childName || 'your child'}
Preparation needed: ${preparation || 'none specified'}
Parent is responsible: ${isUserResponsible ? 'yes' : 'no'}
Days until event: ${daysUntilEvent}

Create a concise, friendly notification message that:
- Is conversational and helpful
- Mentions timing relative to custody schedule if relevant
- Includes preparation reminders if applicable
- Is actionable and specific

Examples of good messages:
- "Hazel's dress-up day is Thursday (your drop-off) – prep outfit tonight."
- "Layla's pizza day canceled tomorrow (your day) – adjust lunch."
- "Library day for Emma next Tuesday – remember to return books by Monday."

Keep it under 100 characters and make it sound natural.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful parenting assistant that creates concise, actionable notification messages for school events.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const message = response.choices[0].message.content?.trim();
    if (!message) {
      // Fallback message
      return `${childName || 'Child'}'s ${eventTitle} on ${eventDate}${preparation ? ` - ${preparation}` : ''}`;
    }

    return message;
  } catch (error) {
    console.error("Error generating notification message:", error);
    // Fallback message
    return `${childName || 'Child'}'s ${eventTitle} on ${eventDate}${preparation ? ` - ${preparation}` : ''}`;
  }
}