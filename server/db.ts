import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

// Check if we have a database URL
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production');
  }

  console.log('⚠️  No DATABASE_URL found - running in development mode with mock database');
}

// Create database connection or mock
export const db = DATABASE_URL 
  ? drizzle(new Pool({ connectionString: DATABASE_URL }), { 
      schema,
      logger: process.env.NODE_ENV === 'development'
    })
  : {
      // Mock database object for development
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([]),
          limit: () => Promise.resolve([])
        })
      }),
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([{ id: 1, createdAt: new Date() }])
        })
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve([])
        })
      }),
      delete: () => ({
        where: () => Promise.resolve([])
      })
    } as any;
