import { pgTable, serial, text, timestamp, boolean, integer, jsonb, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table - Parents using the app
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  customEmailAddress: varchar('custom_email_address', { length: 255 }).unique(), // e.g., ed@parentpal.app
  smsPhone: varchar('sms_phone', { length: 20 }),
  smsEnabled: boolean('sms_enabled').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Children table - Kids whose events are being tracked
export const children = pgTable('children', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Parenting schedule - Which parent has custody on which days
export const parentingSchedule = pgTable('parenting_schedule', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  childId: integer('child_id').notNull().references(() => children.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, 1 = Monday, etc.
  hasChild: boolean('has_child').notNull(), // true if user has child on this day
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Raw emails received from schools
export const emails = pgTable('emails', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  sender: varchar('sender', { length: 255 }).notNull(),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
  processed: boolean('processed').default(false),
});

// Extracted events from emails
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emailId: integer('email_id').references(() => emails.id, { onDelete: 'set null' }),
  childId: integer('child_id').references(() => children.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  eventDate: timestamp('event_date').notNull(),
  preparation: text('preparation'), // Required preparation (costumes, forms, money)
  isCanceled: boolean('is_canceled').default(false),
  isCompleted: boolean('is_completed').default(false),
  notes: text('notes'), // User notes
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Notifications sent to users
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventId: integer('event_id').references(() => events.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // 'email', 'sms', 'daily_briefing'
  message: text('message').notNull(),
  sentAt: timestamp('sent_at'),
  delivered: boolean('delivered').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  children: many(children),
  emails: many(emails),
  events: many(events),
  notifications: many(notifications),
  parentingSchedule: many(parentingSchedule),
}));

export const childrenRelations = relations(children, ({ one, many }) => ({
  user: one(users, {
    fields: [children.userId],
    references: [users.id],
  }),
  events: many(events),
  parentingSchedule: many(parentingSchedule),
}));

export const parentingScheduleRelations = relations(parentingSchedule, ({ one }) => ({
  user: one(users, {
    fields: [parentingSchedule.userId],
    references: [users.id],
  }),
  child: one(children, {
    fields: [parentingSchedule.childId],
    references: [children.id],
  }),
}));

export const emailsRelations = relations(emails, ({ one, many }) => ({
  user: one(users, {
    fields: [emails.userId],
    references: [users.id],
  }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
  email: one(emails, {
    fields: [events.emailId],
    references: [emails.id],
  }),
  child: one(children, {
    fields: [events.childId],
    references: [children.id],
  }),
  notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [notifications.eventId],
    references: [events.id],
  }),
}));

// Insert schemas - simplified for now
export const insertUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  customEmailAddress: z.string().optional(),
  smsPhone: z.string().optional(),
  smsEnabled: z.boolean().default(false),
});

export const insertChildSchema = z.object({
  name: z.string().min(1),
  userId: z.number(),
});

export const insertParentingScheduleSchema = z.object({
  userId: z.number(),
  childId: z.number(),
  dayOfWeek: z.number().min(0).max(6),
  hasChild: z.boolean(),
});

export const insertEmailSchema = z.object({
  userId: z.number(),
  subject: z.string().min(1),
  body: z.string().min(1),
  sender: z.string().email(),
  processed: z.boolean().default(false),
});

export const insertEventSchema = z.object({
  userId: z.number(),
  emailId: z.number().optional(),
  childId: z.number().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  eventDate: z.string(),
  preparation: z.string().optional(),
  isCanceled: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  notes: z.string().optional(),
});

export const insertNotificationSchema = z.object({
  userId: z.number(),
  eventId: z.number().optional(),
  type: z.enum(['email', 'sms', 'daily_briefing']),
  message: z.string().min(1),
  delivered: z.boolean().default(false),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Child = typeof children.$inferSelect;
export type InsertChild = typeof children.$inferInsert;

export type ParentingSchedule = typeof parentingSchedule.$inferSelect;
export type InsertParentingSchedule = typeof parentingSchedule.$inferInsert;

export type Email = typeof emails.$inferSelect;
export type InsertEmail = typeof emails.$inferInsert;

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;