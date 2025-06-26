import type { 
  User, InsertUser, 
  Child, InsertChild,
  ParentingSchedule, InsertParentingSchedule,
  Email, InsertEmail,
  Event, InsertEvent,
  Notification, InsertNotification
} from "../shared/schema";
import { db } from "./db";
import { users, children, parentingSchedule, emails, events, notifications } from "../shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUser(id: number): Promise<User | undefined>;
  
  // Children
  createChild(child: InsertChild): Promise<Child>;
  getChildrenByUserId(userId: number): Promise<Child[]>;
  
  // Parenting Schedule
  createParentingSchedule(schedule: InsertParentingSchedule): Promise<ParentingSchedule>;
  getParentingScheduleByUserId(userId: number): Promise<ParentingSchedule[]>;
  getUserResponsibilityForDate(userId: number, childId: number, date: Date): Promise<boolean>;
  
  // Emails
  createEmail(email: InsertEmail): Promise<Email>;
  getUnprocessedEmails(): Promise<Email[]>;
  markEmailAsProcessed(id: number): Promise<void>;
  
  // Events
  createEvent(event: any): Promise<Event>;
  getEventsByUserId(userId: number): Promise<Event[]>;
  getUpcomingEventsByUserId(userId: number): Promise<Event[]>;
  updateEvent(id: number, updates: Partial<Event>): Promise<Event>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUserId(userId: number): Promise<Notification[]>;
  markNotificationAsSent(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  // Children
  async createChild(childData: InsertChild): Promise<Child> {
    const [child] = await db
      .insert(children)
      .values(childData)
      .returning();
    return child;
  }

  async getChildrenByUserId(userId: number): Promise<Child[]> {
    return await db
      .select()
      .from(children)
      .where(eq(children.userId, userId));
  }

  // Parenting Schedule
  async createParentingSchedule(scheduleData: InsertParentingSchedule): Promise<ParentingSchedule> {
    const [schedule] = await db
      .insert(parentingSchedule)
      .values(scheduleData)
      .returning();
    return schedule;
  }

  async getParentingScheduleByUserId(userId: number): Promise<ParentingSchedule[]> {
    return await db
      .select()
      .from(parentingSchedule)
      .where(eq(parentingSchedule.userId, userId));
  }

  async getUserResponsibilityForDate(userId: number, childId: number, date: Date): Promise<boolean> {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const [schedule] = await db
      .select()
      .from(parentingSchedule)
      .where(
        and(
          eq(parentingSchedule.userId, userId),
          eq(parentingSchedule.childId, childId),
          eq(parentingSchedule.dayOfWeek, dayOfWeek)
        )
      );
    
    return schedule?.hasChild || false;
  }

  // Emails
  async createEmail(emailData: InsertEmail): Promise<Email> {
    const [email] = await db
      .insert(emails)
      .values(emailData)
      .returning();
    return email;
  }

  async getUnprocessedEmails(): Promise<Email[]> {
    return await db
      .select()
      .from(emails)
      .where(eq(emails.processed, false))
      .orderBy(asc(emails.receivedAt));
  }

  async markEmailAsProcessed(id: number): Promise<void> {
    await db
      .update(emails)
      .set({ processed: true })
      .where(eq(emails.id, id));
  }

  // Events
  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(eventData)
      .returning();
    return event;
  }

  async getEventsByUserId(userId: number): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(eq(events.userId, userId))
      .orderBy(asc(events.eventDate));
  }

  async getUpcomingEventsByUserId(userId: number): Promise<Event[]> {
    const now = new Date();
    return await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.userId, userId),
          eq(events.isCanceled, false)
        )
      )
      .orderBy(asc(events.eventDate));
  }

  async updateEvent(id: number, updates: Partial<Event>): Promise<Event> {
    const [event] = await db
      .update(events)
      .set(updates)
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  // Notifications
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsSent(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        delivered: true,
        sentAt: new Date()
      })
      .where(eq(notifications.id, id));
  }
}

export const storage = new DatabaseStorage();