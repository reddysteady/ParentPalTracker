
import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  customEmailAddress: text('custom_email_address'), // For forwarding school emails
  phoneNumber: text('phone_number'),
  gmailTokens: jsonb('gmail_tokens'), // Store Gmail OAuth tokens
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Children table
export const children = pgTable('children', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  school: text('school'),
  grade: text('grade'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Emails table - stores incoming school emails
export const emails = pgTable('emails', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  sender: text('sender').notNull(),
  receivedAt: timestamp('received_at').notNull(),
  processed: boolean('processed').default(false),
  gmailMessageId: text('gmail_message_id'),
  createdAt: timestamp('created_at').defaultNow()
});

// Events table - extracted from emails
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  childId: integer('child_id').references(() => children.id),
  emailId: integer('email_id').references(() => emails.id),
  title: text('title').notNull(),
  description: text('description'),
  eventDate: timestamp('event_date'),
  location: text('location'),
  requiresAction: boolean('requires_action').default(false),
  actionDeadline: timestamp('action_deadline'),
  extractedData: jsonb('extracted_data'), // Raw NLP extraction results
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Notifications table - SMS/alerts sent to parents
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  eventId: integer('event_id').references(() => events.id),
  type: text('type').notNull(), // 'sms', 'email', 'push'
  message: text('message').notNull(),
  sentAt: timestamp('sent_at'),
  status: text('status').default('pending'), // 'pending', 'sent', 'failed'
  externalId: text('external_id'), // Twilio message ID, etc.
  createdAt: timestamp('created_at').defaultNow()
});
