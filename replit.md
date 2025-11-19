# GCC English Meetup Club Management System

## Overview

This project is a comprehensive web application designed to manage the "GCC English Meetup Club." It supports member management, attendance tracking, a voting system, smart room assignments, and overall club administration. The system aims to streamline club operations, enforce business rules, and provide a robust platform for members and administrators. Key capabilities include multi-location support, automated penalty systems, and a sophisticated room assignment algorithm, ensuring efficient and fair club operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18+ with TypeScript
- **UI Library**: Shadcn/ui (Radix UI base)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

### Backend
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js (local strategy, session-based)
- **Session Storage**: PostgreSQL-backed using `connect-pg-simple`
- **Password Security**: Node.js crypto module (scrypt)
- **API Design**: RESTful with role-based access control
- **Middleware**: Custom authentication and authorization

### Database
- **Database**: PostgreSQL with Drizzle ORM
- **Connection**: Neon Database serverless PostgreSQL
- **Schema Management**: Drizzle Kit
- **Key Entities**:
    - **Users**: Member details, roles (Lead/Sub-Lead), consecutive absence tracking.
    - **Votes & VoteResponses**: Attendance voting and responses.
    - **AttendanceRecords**: Meeting attendance, arrival times, late fee tracking.
    - **RoomAssignments**: Smart room allocation with leader designation.
    - **Presenters**: Scheduling, submission tracking, deadline management.
    - **FinancialAccounts & Transactions**: Member finances, fees, deposits, penalties.
    - **Warnings**: System for member warnings and automatic suspensions.
    - **Locations**: Multi-location support for meetings with specific times and deadlines.
    - **PendingAttendanceRecords**: Temporary storage for leader-submitted attendance awaiting admin approval.

### Authentication & Authorization
- **Strategy**: Session-based, secure password hashing.
- **Roles**: USER and ADMIN with granular permissions.
- **Security**: HTTP-only cookies, CSRF protection, forced password changes for new users.
- **Route Protection**: Client-side and server-side validation.

### File Structure
- **Monorepo**: Shared schemas between client and server.
- **Directories**: `/client` (React SPA), `/server` (Express API), `/shared` (Common TypeScript schemas).

### Core Features & Business Logic
- **Multi-Location Support**: Members can select one location per week, each with independent meeting times and vote deadlines. Week boundaries are enforced in KST.
- **Smart Room Assignment**: Algorithm for automated room distribution, avoiding recent room assignments, balancing sizes, and auto-selecting room leaders based on honor level.
- **Room Leader System**: Designated leaders can submit attendance for their rooms, which requires admin approval.
- **Automated Scheduling**: Node-cron based tasks for:
    - Semi-annual warning resets (Jan 1st, July 1st).
    - Vote deadline enforcement (penalizing non-voters).
    - Presenter deadline checks (penalizing late topic submissions).
- **Graduated Penalty System**:
    - **Cancellation Penalties**: Varying fees for vote cancellations based on proximity to meeting day.
    - **Late Fees**: Calculated based on arrival time at meetings.
    - **Presenter Penalties**: For late submissions and no-shows.
    - **Consecutive Absences**: Automatic suspension based on honor-level thresholds.
    - **Warning System**: 3 unresolved warnings lead to suspension; warnings reset semi-annually.
    - **Financial Management**: Annual fees, deposit requirements, automatic deductions, and balance alerts.

## External Dependencies

### Core
- **@neondatabase/serverless**: Serverless PostgreSQL connection.
- **drizzle-orm**: Type-safe ORM.
- **passport**: Authentication middleware.
- **express-session**: Session management.
- **@tanstack/react-query**: Server state management.

### UI & Styling
- **@radix-ui/***: Accessible UI primitives.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Type-safe component variants.
- **lucide-react**: Icon library.

### Development & Utilities
- **vite**: Build tool and development server.
- **typescript**: Static type checking.
- **react-hook-form**: Performant form handling.
- **zod**: Schema validation.
- **date-fns**: Date manipulation.
- **wouter**: Lightweight React router.
- **clsx**: Conditional CSS class composition.
- **connect-pg-simple**: PostgreSQL session store.