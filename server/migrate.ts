
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { users, children, emails, events, notifications } from '../shared/schema';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required for migration');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { 
  schema: { users, children, emails, events, notifications },
  logger: true
});

async function migrate() {
  try {
    console.log('🔄 Creating database tables...');
    
    // Create tables using raw SQL since Drizzle doesn't have built-in migration runner
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        custom_email_address TEXT,
        phone_number TEXT,
        gmail_tokens JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS children (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        school TEXT,
        grade TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS emails (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        subject TEXT NOT NULL,
        body TEXT,
        sender TEXT,
        received_at TIMESTAMP NOT NULL,
        gmail_message_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        child_id INTEGER REFERENCES children(id),
        email_id INTEGER REFERENCES emails(id),
        title TEXT NOT NULL,
        description TEXT,
        event_date TIMESTAMP,
        location TEXT,
        requires_action BOOLEAN DEFAULT FALSE,
        action_deadline TIMESTAMP,
        extracted_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        event_id INTEGER REFERENCES events(id),
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        scheduled TIMESTAMP NOT NULL,
        sent BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Database tables created successfully!');
    
    // Test the connection with a simple query
    const result = await pool.query('SELECT COUNT(*) FROM users');
    console.log('✅ Database connection test successful - users table accessible');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
