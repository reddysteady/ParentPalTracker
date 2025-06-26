import { Router } from 'express';
import { storage } from './storage';
import { extractEventsFromEmail, generateNotificationMessage } from './nlp';
import { 
  insertUserSchema, 
  insertChildSchema, 
  insertParentingScheduleSchema,
  insertEmailSchema 
} from '../shared/schema';
import { z } from 'zod';

const router = Router();

// Users
router.post('/api/users', async (req, res) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    const user = await storage.createUser(userData);
    res.json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Children
router.post('/api/children', async (req, res) => {
  try {
    const childData = insertChildSchema.parse(req.body);
    const child = await storage.createChild(childData);
    res.json(child);
  } catch (error) {
    console.error('Error creating child:', error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/users/:userId/children', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const children = await storage.getChildrenByUserId(userId);
    res.json(children);
  } catch (error) {
    console.error('Error getting children:', error);
    res.status(500).json({ error: error.message });
  }
});

// Parenting Schedule
router.post('/api/parenting-schedule', async (req, res) => {
  try {
    const scheduleData = insertParentingScheduleSchema.parse(req.body);
    const schedule = await storage.createParentingSchedule(scheduleData);
    res.json(schedule);
  } catch (error) {
    console.error('Error creating parenting schedule:', error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/users/:userId/parenting-schedule', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const schedule = await storage.getParentingScheduleByUserId(userId);
    res.json(schedule);
  } catch (error) {
    console.error('Error getting parenting schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk parenting schedule setup
router.post('/api/users/:userId/parenting-schedule/bulk', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { childId, schedule } = req.body; // schedule is array of 7 booleans for each day of week
    
    if (!Array.isArray(schedule) || schedule.length !== 7) {
      return res.status(400).json({ error: 'Schedule must be an array of 7 booleans' });
    }

    const results: any[] = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const scheduleData = {
        userId,
        childId,
        dayOfWeek,
        hasChild: schedule[dayOfWeek]
      };
      const result = await storage.createParentingSchedule(scheduleData);
      results.push(result);
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error creating bulk parenting schedule:', error);
    res.status(400).json({ error: error.message });
  }
});

// Emails
router.post('/api/emails', async (req, res) => {
  try {
    const emailData = insertEmailSchema.parse(req.body);
    const email = await storage.createEmail(emailData);
    res.json(email);
  } catch (error) {
    console.error('Error creating email:', error);
    res.status(400).json({ error: error.message });
  }
});

// Process emails with NLP
router.post('/api/emails/process', async (req, res) => {
  try {
    const unprocessedEmails = await storage.getUnprocessedEmails();
    const results: any[] = [];

    for (const email of unprocessedEmails) {
      try {
        // Extract events using OpenAI
        const extractedEvents = await extractEventsFromEmail(email.subject, email.body);
        
        // Create events in database
        for (const extractedEvent of extractedEvents) {
          // Try to match child by name if provided
          let childId: number | undefined = undefined;
          if (extractedEvent.childName) {
            const children = await storage.getChildrenByUserId(email.userId);
            const matchedChild = children.find(child => 
              child.name.toLowerCase().includes(extractedEvent.childName!.toLowerCase())
            );
            childId = matchedChild?.id;
          }

          const eventData = {
            userId: email.userId,
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
          results.push({ email: email.id, event: event.id });
        }

        // Mark email as processed
        await storage.markEmailAsProcessed(email.id);
      } catch (eventError: any) {
        console.error(`Error processing email ${email.id}:`, eventError);
        results.push({ email: email.id, error: eventError.message });
      }
    }

    res.json({ processed: results });
  } catch (error: any) {
    console.error('Error processing emails:', error);
    res.status(500).json({ error: error.message });
  }
});

// Events
router.get('/api/users/:userId/events', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const events = await storage.getUpcomingEventsByUserId(userId);
    res.json(events);
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/api/events/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const event = await storage.updateEvent(id, updates);
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(400).json({ error: error.message });
  }
});

// Generate daily briefing
router.post('/api/users/:userId/daily-briefing', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const targetDate = req.body.date ? new Date(req.body.date) : new Date();
    
    // Get events for the specified date
    const allEvents = await storage.getUpcomingEventsByUserId(userId);
    const todayEvents = allEvents.filter(event => {
      const eventDate = new Date(event.eventDate);
      return eventDate.toDateString() === targetDate.toDateString();
    });

    if (todayEvents.length === 0) {
      return res.json({ message: "No events scheduled for today." });
    }

    // Generate briefing text
    let briefing = `Today: `;
    const eventDescriptions: string[] = [];
    
    for (const event of todayEvents) {
      let description = event.title;
      if (event.preparation) {
        description += ` (${event.preparation})`;
      }
      eventDescriptions.push(description);
    }
    
    briefing += eventDescriptions.join(', ');

    // Create notification record
    const notification = await storage.createNotification({
      userId,
      type: 'daily_briefing',
      message: briefing,
      delivered: false,
    });

    res.json({ briefing, notificationId: notification.id });
  } catch (error) {
    console.error('Error generating daily briefing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Notifications
router.get('/api/users/:userId/notifications', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const notifications = await storage.getNotificationsByUserId(userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;