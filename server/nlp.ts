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

    console.log('Raw OpenAI response:', response);

    // Clean up the response to extract JSON
    let cleanedResponse = response.trim();
    
    // Remove common prefixes/suffixes that OpenAI might add
    cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Find JSON array boundaries
    const jsonStart = cleanedResponse.indexOf('[');
    const jsonEnd = cleanedResponse.lastIndexOf(']');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    console.log('Cleaned response for parsing:', cleanedResponse);

    // Parse the JSON response with error handling
    let events;
    try {
      events = JSON.parse(cleanedResponse);
    } catch (jsonError) {
      console.error('JSON parsing failed:', jsonError);
      console.error('Failed to parse response:', cleanedResponse);
      throw new Error(`Invalid JSON response from OpenAI: ${jsonError}`);
    }
    
    // Validate it's an array
    if (!Array.isArray(events)) {
      console.log('OpenAI response is not an array:', events);
      return [];
    }

    console.log(`Extracted ${events.length} events from email`);
    return events;

  } catch (error: any) {
    console.error('Error extracting events with OpenAI:', error.message);
    
    // Check if it's a rate limit error
    if (error.message.includes('Rate limit reached')) {
      console.log('OpenAI rate limit reached, using intelligent fallback parsing');
      return parseEmailWithFallback(subject, body);
    }
    
    // Fallback: create a basic event from subject line
    const fallbackEvent: ExtractedEvent = {
      title: subject,
      description: body.substring(0, 500),
      eventDate: new Date().toISOString().split('T')[0], // Today as fallback
      requiresAction: false,
      isCanceled: false,
    };

    console.log('Using basic fallback event extraction');
    return [fallbackEvent];
  }
}

/**
 * Intelligent fallback parsing when OpenAI is unavailable
 */
function parseEmailWithFallback(subject: string, body: string): ExtractedEvent[] {
  console.log('Using intelligent fallback parsing for:', subject);
  
  const events: ExtractedEvent[] = [];
  const combinedText = `${subject} ${body}`.toLowerCase();
  
  // Common event keywords and patterns
  const eventKeywords = [
    'field trip', 'fieldtrip', 'trip', 'excursion',
    'match', 'game', 'tournament', 'competition',
    'concert', 'recital', 'performance', 'show',
    'meeting', 'conference', 'assembly',
    'deadline', 'due date', 'submission',
    'event', 'activity', 'celebration',
    'picture day', 'photo day',
    'sports day', 'track and field',
    'graduation', 'ceremony'
  ];
  
  // Check if this looks like an event email
  const hasEventKeyword = eventKeywords.some(keyword => combinedText.includes(keyword));
  
  if (hasEventKeyword) {
    // Extract date patterns (basic regex)
    const datePatterns = [
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/gi,
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g,
      /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/g
    ];
    
    let extractedDate = null;
    for (const pattern of datePatterns) {
      const match = body.match(pattern);
      if (match) {
        try {
          extractedDate = new Date(match[0]).toISOString().split('T')[0];
          break;
        } catch {
          // Invalid date format, continue
        }
      }
    }
    
    // Extract child names (look for common name patterns)
    const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
    const possibleNames = body.match(namePattern) || [];
    const childName = possibleNames.find(name => 
      name.length > 2 && name.length < 20 && !['School', 'Dear', 'From', 'To', 'Date'].includes(name)
    );
    
    const event: ExtractedEvent = {
      title: subject,
      description: body.substring(0, 300),
      eventDate: extractedDate || new Date().toISOString().split('T')[0],
      childName: childName,
      requiresAction: combinedText.includes('deadline') || combinedText.includes('due') || combinedText.includes('submit'),
      isCanceled: combinedText.includes('cancel') || combinedText.includes('postpone')
    };
    
    events.push(event);
    console.log(`Fallback parsing extracted 1 event: ${event.title}`);
  } else {
    // Store as general communication
    const event: ExtractedEvent = {
      title: subject,
      description: body.substring(0, 300),
      eventDate: new Date().toISOString().split('T')[0],
      requiresAction: false,
      isCanceled: false
    };
    
    events.push(event);
    console.log('Fallback parsing stored as general communication');
  }
  
  return events;
}

/**
 * Check if OpenAI is properly configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}