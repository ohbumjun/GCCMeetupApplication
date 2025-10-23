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
  - Users (with membership levels, industries, contact info)
  - Votes and VoteResponses (attendance voting system)
  - AttendanceRecords (meeting attendance tracking)
  - RoomAssignments (smart room allocation)
  - MeetingTopics (topic management)
  - Suggestions (member feedback system)
  - FinancialAccounts (member financial accounts, annual fee, deposit balance)
  - FinancialTransactions (transaction history, automatic fee deductions)

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