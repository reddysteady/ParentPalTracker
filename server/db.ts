import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

// In development mode without DATABASE_URL, create a mock db object
if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production');
  }

  console.log('⚠️  No DATABASE_URL found - running in development mode with mock database');

  // Create a mock database object for development
  export const db = {
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
} else {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  export const db = drizzle(pool, { 
    schema,
    logger: process.env.NODE_ENV === 'development'
  });
}