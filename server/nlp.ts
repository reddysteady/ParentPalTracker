import OpenAI from 'openai';

interface ExtractedEvent {
  title: string;
  description: string;
  eventDate: string;
  childName?: string;
  location?: string;
  preparation?: string;
  requiresAction?: boolean;
  actionDeadline?: string;
  isCanceled?: boolean;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract events from email content using OpenAI
 */
export async function extractEventsFromEmail(subject: string, body: string): Promise<ExtractedEvent[]> {
  try {
    console.log('Extracting events from email:', subject);

    const prompt = `
Extract school events and important information from this email. Return a JSON array of events.

Email Subject: ${subject}
Email Body: ${body}

For each event found, include:
- title: Brief descriptive title
- description: Full description or details
- eventDate: Date in ISO format (YYYY-MM-DD) if found
- childName: Child's name if mentioned
- location: Location if specified
- preparation: What needs to be prepared (forms, items, etc.)
- requiresAction: true if parent action is required
- actionDeadline: Deadline for action in ISO format if specified
- isCanceled: true if event is canceled

Return only valid JSON array, no other text:
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured event information from school emails. Always return valid JSON arrays only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      console.log('No response from OpenAI');
      return [];
    }

    // Parse the JSON response
    const events = JSON.parse(response.trim());
    
    // Validate it's an array
    if (!Array.isArray(events)) {
      console.log('OpenAI response is not an array:', events);
      return [];
    }

    console.log(`Extracted ${events.length} events from email`);
    return events;

  } catch (error: any) {
    console.error('Error extracting events with OpenAI:', error.message);
    
    // Fallback: create a basic event from subject line
    const fallbackEvent: ExtractedEvent = {
      title: subject,
      description: body.substring(0, 500),
      eventDate: new Date().toISOString().split('T')[0], // Today as fallback
      requiresAction: false,
      isCanceled: false,
    };

    console.log('Using fallback event extraction');
    return [fallbackEvent];
  }
}

/**
 * Check if OpenAI is properly configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}