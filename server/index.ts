import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use(routes);

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ParentPal server running on port ${PORT}`);
  console.log(`📧 Ready to process school emails and manage parenting schedules`);
  console.log(`🌐 Local access: http://0.0.0.0:${PORT}`);
  console.log(`🌐 External access: https://parentpaltracker.${process.env.REPL_OWNER}.replit.dev`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, '../public')}`);

  // Log environment status
  console.log('Environment check:', {
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasGoogleRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

export default app;