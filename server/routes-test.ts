import express, { Router } from 'express';

const router = Router();

// Simple test routes to isolate the pathToRegexp issue
router.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.get('/api/test', (req, res) => {
  res.json({ message: 'test route working' });
});

export default router;