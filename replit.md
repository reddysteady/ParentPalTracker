# ParentPal MVP - Replit Project Guide

## Overview

ParentPal is a web application designed to help divorced or separated parents stay organized with their children's school events and activities. The MVP focuses on extracting information from school emails, aligning it with custody schedules, and providing smart notifications to ensure parents are prepared for their responsibilities.

## System Architecture

### Frontend Architecture
- **Mobile-first web interface** using responsive design principles
- **Timeline-based event display** filtered by user's parenting days
- **Simple form-based schedule input** for initial setup
- **Progressive Web App (PWA)** capabilities for mobile experience

### Backend Architecture
- **Email processing service** with custom forwarding addresses
- **Event extraction engine** using NLP/rule-based parsing
- **Notification system** supporting email and SMS delivery
- **RESTful API** for frontend communication
- **Scheduled job system** for email polling and daily briefings

### Data Storage
- **User profiles** with authentication and preferences
- **Parenting schedules** stored as recurring calendar events
- **Email archives** with extracted event data
- **Notification history** and delivery status tracking

## Key Components

### 1. Email Ingestion System
- **Custom email forwarding** (e.g., user@parentpal.app)
- **Email polling service** for frequent message retrieval
- **Email parsing** to extract structured data from school communications

### 2. Event Extraction Engine
- **NLP processing** to identify:
  - Event names and descriptions
  - Dates and times
  - Required preparations
  - Cancellations or changes
- **Structured data output** for calendar integration

### 3. Schedule Management
- **Schedule input interface** supporting Word table uploads or manual entry
- **Calendar mapping system** to determine parent responsibilities
- **Recurring event handling** for custody patterns

### 4. Notification System
- **Smart notification logic** based on event timing and responsible parent
- **Multi-channel delivery** (email, SMS)
- **Daily briefing generation** with personalized summaries
- **Real-time alerts** for time-sensitive items

### 5. Mobile Web Interface
- **Event timeline view** filtered by user's parenting days
- **Event management** (mark as done, add notes)
- **Responsive design** optimized for mobile devices

## Data Flow

1. **Email Reception**: School emails forwarded to custom addresses
2. **Processing**: Email content parsed and events extracted
3. **Schedule Alignment**: Events matched with custody calendar
4. **Notification Generation**: Smart alerts created based on timing and responsibility
5. **Delivery**: Notifications sent via email/SMS
6. **User Interaction**: Parents view events and manage through web interface

## External Dependencies

### Email Services
- **Email forwarding provider** for custom addresses
- **SMTP service** for outbound notifications
- **Email parsing libraries** for content extraction

### Communication Services
- **SMS provider** (Twilio, AWS SNS) for text notifications
- **Email delivery service** for reliable message delivery

### NLP/Processing
- **Text processing libraries** for event extraction
- **Date/time parsing utilities** for schedule alignment
- **Document processing** for schedule uploads

## Deployment Strategy

### Infrastructure
- **Cloud hosting** with auto-scaling capabilities
- **Database hosting** with backup and recovery
- **Job scheduling** for background processing
- **CDN** for static asset delivery

### Monitoring
- **Email processing metrics** and error tracking
- **Notification delivery rates** and failure analysis
- **User engagement tracking** for feature optimization

## User Preferences

Preferred communication style: Simple, everyday language.

## Technical Stack

### Backend
- **Node.js with Express** - REST API server
- **TypeScript** - Type safety and modern JavaScript features
- **Drizzle ORM** - Database operations and schema management
- **PostgreSQL** - Primary database (via Supabase)
- **OpenAI GPT-4o** - NLP for extracting events from school emails
- **Zod** - Request validation and type safety

### Frontend  
- **Progressive Web App** - Mobile-first HTML/CSS/JavaScript interface
- **Responsive Design** - Optimized for mobile devices
- **RESTful API Integration** - Clean separation between frontend and backend

### Database Schema
- **Users** - Parent profiles with contact preferences
- **Children** - Child records linked to parents
- **Parenting Schedule** - Custody calendar (day of week mappings)
- **Emails** - Raw school emails for processing
- **Events** - Extracted events with dates, preparation requirements
- **Notifications** - Generated alerts and daily briefings

### Key Features Implemented
1. **Email Ingestion** - Store and process school emails
2. **AI Event Extraction** - OpenAI GPT-4o extracts structured event data
3. **User Management** - Create parent profiles and add children
4. **Event Timeline** - View upcoming events filtered by responsibility
5. **Smart Processing** - Match events to children by name recognition

## Current Status

### ✅ Completed
- Database schema with proper relations and Zod validation
- PostgreSQL database setup with Neon serverless connection
- Database storage implementation with full CRUD operations
- OpenAI integration for email processing
- RESTful API endpoints for all core operations
- Responsive web interface for testing
- Email processing with event extraction
- Email Settings with domain filtering functionality
- Gmail search optimization for cost reduction

### 🔄 In Progress  
- Gmail OAuth token refresh optimization for expired credentials
- Email processing optimization with domain filtering

### 📋 Next Steps
1. Implement parenting schedule management
2. Add notification system with SMS support
3. Create daily briefing generation
4. Test with real school domain configurations

## Changelog

- June 26, 2025 - Initial project setup and architecture
- June 26, 2025 - Complete backend API with OpenAI integration
- June 26, 2025 - Progressive web app interface created
- June 27, 2025 - PostgreSQL database setup completed with Neon serverless connection
- June 27, 2025 - Database storage implementation with full CRUD operations
- June 27, 2025 - Database schema with relations and Zod validation added