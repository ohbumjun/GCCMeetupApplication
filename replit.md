# GCC English Meetup Club Management System

## Overview

This is a comprehensive web application for managing the "GCC English Meetup Club" with a modern full-stack architecture. The system handles member management, attendance tracking, voting systems, room assignments, and club administration. Built with React frontend and Express.js backend, it provides role-based access control with separate interfaces for club members and administrators.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript for type safety
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Password Security**: Node.js crypto module with scrypt for hashing
- **API Design**: RESTful endpoints with role-based access control
- **Middleware**: Custom authentication and authorization middleware

### Database Design
- **Database**: PostgreSQL with Drizzle ORM
- **Connection**: Neon Database serverless PostgreSQL
- **Schema Management**: Drizzle Kit for migrations and schema updates
- **Key Tables**: 
  - Users (with membership levels, industries, contact info, Lead/Sub-Lead roles, consecutive absences tracking)
  - Votes and VoteResponses (attendance voting system)
  - AttendanceRecords (meeting attendance tracking with arrival time for late fee calculation)
  - RoomAssignments (smart room allocation)
  - MeetingTopics (topic management)
  - Suggestions (member feedback system)
  - FinancialAccounts (member financial accounts, annual fee, deposit balance)
  - FinancialTransactions (transaction history, automatic fee deductions)
  - Presenters (presenter scheduling, topic/material submission tracking, deadline management)
  - Warnings (warning system with automatic suspension)

### Authentication & Authorization
- **Strategy**: Session-based authentication with secure password hashing
- **Roles**: USER and ADMIN with granular permissions
- **Session Security**: HTTP-only cookies with CSRF protection
- **Password Policy**: Forced password changes for new users
- **Protected Routes**: Client-side route protection with server-side validation

### File Structure
- **Monorepo Layout**: Shared schemas between client and server
- **Client**: React SPA in `/client` directory
- **Server**: Express API in `/server` directory
- **Shared**: Common TypeScript schemas in `/shared` directory
- **Components**: Modular UI components with separation of concerns

### Development Features
- **Type Safety**: Full TypeScript coverage across frontend and backend
- **Development Tools**: Hot module replacement, error overlays, dev banners
- **Code Quality**: ESLint, TypeScript compiler checks
- **Build Process**: Optimized production builds with code splitting

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **passport**: Authentication middleware with local strategy
- **express-session**: Session management with PostgreSQL store
- **@tanstack/react-query**: Server state management and caching

### UI & Styling
- **@radix-ui/***: Accessible UI primitives (dialogs, dropdowns, forms, etc.)
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe component variants
- **lucide-react**: Modern icon library

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **@replit/vite-plugin-***: Replit-specific development plugins
- **react-hook-form**: Performant form handling
- **zod**: Schema validation and type inference

### Utilities
- **date-fns**: Date manipulation and formatting
- **wouter**: Lightweight React router
- **clsx**: Conditional CSS class composition
- **connect-pg-simple**: PostgreSQL session store

## Recent Updates (2025-11-19)

### Phase 12: Multi-Location Support (COMPLETED)

The system has been upgraded from single-location (Sinchon) to multi-location support where members can select one location per week with varying meeting times and vote deadlines per location.

**1. Database Schema Expansion**
- Created `locations` table with fields: id, name, address, meetingTime (e.g., "10:00"), voteDeadline (e.g., "19:30 Wednesday"), isActive
- Added `locationId` foreign key to: votes, attendanceRecords, roomAssignments, presenters
- Added `leaderId` to roomAssignments for room leader functionality
- Data migration: Default "신촌 본부" location created and linked to all existing records

**2. Storage Layer (server/storage.ts)**
- Location CRUD methods: `createLocation()`, `getLocationById()`, `getActiveLocations()`, `updateLocation()`, `deleteLocation()`
- **KST timezone-safe weekly vote limit**: `checkUserWeeklyVoteLimit()` uses `utcToZonedTime` / `zonedTimeToUtc` from date-fns-tz
  - Ensures members can only vote at ONE location per week (KST Sunday-Saturday)
  - Prevents timezone drift regardless of server locale (UTC, PST, KST)
  - Week boundaries calculated in KST, then converted to UTC for database queries
- Room leader validation: `isUserRoomLeader()` checks if user is designated leader for a room

**3. API Routes (server/routes.ts)**
- Location endpoints:
  - `GET /api/locations` - List all active locations
  - `POST /api/locations` - Create new location (admin only)
  - `PATCH /api/locations/:id` - Update location (admin only)
  - `DELETE /api/locations/:id` - Soft delete location (admin only)
- Vote creation validates locationId is provided
- Vote response enforces weekly limit using KST timezone logic

**4. UI Implementation**
- **Locations Management Page** (client/src/pages/locations-page.tsx):
  - Admin interface for CRUD operations
  - Create location form with name, address, meeting time, vote deadline
  - Edit/delete location actions
  - Active/inactive status display
  - Added to sidebar navigation for admins

- **Voting Page Updates** (client/src/pages/voting-page.tsx):
  - Changed from tabs to **cards layout** for scalability (works with unlimited locations)
  - Each location displays as separate card with name, address, and associated votes
  - Loading states for both votes and locations queries
  - Guard against missing location objects with fallback display

**5. Business Rules**
- Members select ONE location per week (enforced in KST timezone)
- Members can switch locations week-to-week (no restriction on location choice)
- Each location has independent meeting time and vote deadline
- Room leaders designated per room can manage attendance for their room members
- All existing penalties, warnings, and financial rules apply across all locations

**6. Technical Highlights**
- **Timezone Safety**: All week boundary calculations use KST regardless of server timezone
- **Data Integrity**: locationId validated at API level (schema currently nullable for backward compatibility)
- **Scalable UI**: Cards layout supports unlimited number of locations without UI breakage
- **Backward Compatibility**: Existing data migrated to default "신촌 본부" location

**Known Limitations**:
- locationId foreign keys are nullable in schema (API validation in place)
- Room leader permissions middleware exists but not fully integrated in UI
- Future: Add NOT NULL constraints via schema migration after data validation

## Recent Updates (2025-10-23)

### Phase 11: Automated Scheduler & Business Rules (COMPLETED)

**1. Semi-Annual Warning Reset (Feature 1)**
- Implemented `resetAllWarnings()` storage method to reset all unresolved warnings
- Automated scheduler using node-cron: Runs January 1st & July 1st at 00:00 KST
- All unresolved warnings are marked as resolved automatically
- Centralized scheduler infrastructure in `server/scheduler.ts`

**2. Vote Deadline Enforcement (Feature 2)**
- Implemented `processVoteDeadlines()` to identify and penalize non-voters
- Automated scheduler: Runs every Wednesday at 19:30 KST
- Logic: Finds ACTIVE votes with expired deadlines, identifies non-voters among ACTIVE members
- Penalty: 1 warning issued per non-voter, automatic suspension check applied
- Vote status updated to CLOSED after processing

**3. Presenter Deadline Auto-Check (Feature 3)**
- Implemented `processPresenterDeadlines()` to check topic submission deadlines
- Automated scheduler: Runs every Thursday at 23:59 KST
- Logic: Finds presenters with NOT_SUBMITTED status and expired topicDeadline
- Penalty: 5,000원 automatic deduction, status updated to LATE_SUBMISSION
- Prevents duplicate penalties with penaltyApplied flag

**4. Time-Based Cancellation Penalties (Feature 4)**
- Added `updatedDate` field to voteResponses table for tracking response changes
- Implemented `updateVoteResponse()` with graduated penalty system
- Cancellation penalty tiers:
  - Thursday night (23:59) or earlier: FREE (0원)
  - Friday–Saturday: 10,000원 penalty
  - Sunday (meeting day): 25,000원 penalty + 1 warning
- Routes updated to allow vote response updates (YES → NO transitions)
- Automatic warning and suspension checks for Sunday cancellations

### Phase 10: Advanced Features Implementation

**1. Presenter Management System (Phase 8)**
- Created `presenters` table with submission status tracking (NOT_SUBMITTED, TOPIC_SUBMITTED, MATERIAL_SUBMITTED, LATE_SUBMISSION)
- Implemented storage methods for presenter CRUD operations
- Added API endpoints for presenter scheduling and submission tracking
- Deadline management: Thursday night deadline with 5,000원 penalty for late submissions
- Absence penalty: 25,000원 for presenter no-shows
- UI: Presenters page added to navigation with presentation status display

**2. Consecutive Absence Tracking (Phase 9)**
- Added `isLead` and `isSubLead` fields to users table
- Implemented automatic consecutive absence counting on attendance updates
- Honor-level graduated thresholds:
  - Default members: 4 weeks → automatic suspension
  - Honor I: 5 weeks
  - Honor II: 6 weeks
  - Honor III: 7 weeks
  - Honor IV: 8 weeks
  - Sub-Lead: 6 weeks
  - Lead: exempt from automatic suspension
- Automatic SUSPENDED status when threshold exceeded

**3. Time-Based Late Fee Calculation (Phase 10)**
- Added `arrivalTime` field to attendance records
- Implemented graduated late fee calculation:
  - Before 10:10: No late fee
  - 10:10-10:19: 5,000원 base late fee
  - 10:20+: 5,000원 + 1,000원 per additional 10 minutes
  - Maximum: 10,000원
- Integrated with attendance API for automatic fee deduction

### Business Rules Implementation
- **Annual Fee**: 30,000원 automatic deduction on account creation
- **Deposit**: 50,000원 required balance
- **Room Fee**: 5,000원 per meeting attendance
- **Late Fee**: Graduated based on arrival time (5,000-10,000원)
- **Cancellation Penalty**: 10,000원 for voting YES but being absent
- **Warning System**: 3 unresolved warnings → automatic suspension
- **Warning Reset**: Scheduled for January 1st and July 1st (6-month cycles)
- **Balance Alert**: Warning issued when balance drops below 15,000원

### Technical Implementation
- All penalty calculations happen server-side in storage layer
- Transactional integrity for financial operations
- Automatic warning creation for penalties
- Cascade suspension checks after warnings
- Honor-based graduated thresholds for member retention