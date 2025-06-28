
import { pgTable, text, integer, timestamp, boolean, jsonb, serial } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  customEmailAddress: text('custom_email_address'),
  phoneNumber: text('phone_number'),
  gmailTokens: jsonb('gmail_tokens'),
  schoolDomains: text('school_domains').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Children table
export const children = pgTable('children', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  school: text('school'),
  grade: text('grade'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Emails table
export const emails = pgTable('emails', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  subject: text('subject').notNull(),
  body: text('body'),
  sender: text('sender'),
  receivedAt: timestamp('received_at').notNull(),
  gmailMessageId: text('gmail_message_id'),
  createdAt: timestamp('created_at').defaultNow()
});

// Events table
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  childId: integer('child_id').references(() => children.id),
  emailId: integer('email_id').references(() => emails.id),
  title: text('title').notNull(),
  description: text('description'),
  eventDate: timestamp('event_date'),
  location: text('location'),
  requiresAction: boolean('requires_action').default(false),
  actionDeadline: timestamp('action_deadline'),
  extractedData: jsonb('extracted_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  eventId: integer('event_id').references(() => events.id),
  type: text('type').notNull(), // 'sms', 'email', 'push'
  message: text('message').notNull(),
  scheduled: timestamp('scheduled').notNull(),
  sent: boolean('sent').default(false),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  children: many(children),
  emails: many(emails),
  events: many(events),
  notifications: many(notifications),
}));

export const childrenRelations = relations(children, ({ one, many }) => ({
  user: one(users, { fields: [children.userId], references: [users.id] }),
  events: many(events),
}));

export const emailsRelations = relations(emails, ({ one, many }) => ({
  user: one(users, { fields: [emails.userId], references: [users.id] }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  user: one(users, { fields: [events.userId], references: [users.id] }),
  child: one(children, { fields: [events.childId], references: [children.id] }),
  email: one(emails, { fields: [events.emailId], references: [emails.id] }),
  notifications: one(notifications, { fields: [events.id], references: [notifications.eventId] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  event: one(events, { fields: [notifications.eventId], references: [events.id] }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChildSchema = createInsertSchema(children).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Child = typeof children.$inferSelect;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
