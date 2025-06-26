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

## Changelog

Changelog:
- June 26, 2025. Initial setup