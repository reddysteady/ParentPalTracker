
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

export default router;
