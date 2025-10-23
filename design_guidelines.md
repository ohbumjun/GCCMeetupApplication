# GCC English Meetup Club Management System - Design Guidelines

## Design Approach: Material Design with Modern Refinements
**Rationale**: Management systems require clear information hierarchy, robust data displays, and consistent patterns. Material Design provides excellent frameworks for complex UIs while remaining clean and professional.

**Core Principles**: Clear visual hierarchy, intentional use of elevation, purposeful motion, data-first layouts

---

## Color Palette

**Light Mode**
- Primary: 220 85% 55% (Professional blue - headers, CTAs, active states)
- Primary Variant: 220 75% 45% (Darker blue for hover states)
- Surface: 0 0% 100% (Card backgrounds)
- Background: 220 15% 97% (Page background)
- Text Primary: 220 20% 15%
- Text Secondary: 220 10% 45%
- Success: 142 70% 45% (Attendance confirmed, approvals)
- Warning: 38 92% 50% (Pending actions, low balances)
- Error: 0 70% 50% (Absences, violations, warnings)
- Border: 220 15% 88%

**Dark Mode**
- Primary: 220 75% 65%
- Surface: 220 20% 12%
- Background: 220 25% 8%
- Text Primary: 220 15% 92%
- Text Secondary: 220 10% 65%
- Border: 220 15% 20%

---

## Typography

**Families**: Inter (primary UI), JetBrains Mono (data/numbers)

**Scale**:
- Display: 36px/700 (Dashboard headers)
- H1: 30px/600 (Section titles)
- H2: 24px/600 (Card headers)
- H3: 18px/600 (Subsections)
- Body: 15px/400 (General content)
- Small: 13px/400 (Labels, metadata)
- Micro: 11px/500 (Badges, tags)

---

## Layout System

**Spacing Units**: Tailwind 2, 3, 4, 6, 8, 12 (e.g., p-4, gap-6, mb-8)

**Grid Structure**: 12-column responsive grid
- Desktop: max-w-7xl with 3-4 column layouts
- Tablet: 2-column stacks
- Mobile: Single column, full-width cards

**Dashboard Layout**: 
- Top: Fixed header (h-16) with navigation and user profile
- Left: Collapsible sidebar (w-64, collapses to w-16 icons-only on tablet)
- Main: Content area with consistent p-6 padding

---

## Component Library

### Navigation
**Top Header**: Logo left, search center, notifications/profile right. Subtle shadow (shadow-sm) for depth.

**Sidebar**: Hierarchical navigation with icons, active state uses primary color background with 8% opacity, hover at 4% opacity. Section dividers between major categories.

### Cards
**Standard Card**: White background, rounded-xl, shadow-md, p-6. Header with title + action buttons, divider, content area.

**Stat Cards**: Grid of metrics cards (grid-cols-4) with large number display, label, trend indicator (↑/↓), subtle icon background.

**Data Tables**: Zebra striping (even rows: surface variant), sticky headers, sortable columns with arrow indicators, row hover state, action menu on right.

### Forms
**Input Fields**: Outlined style, rounded-lg, focus ring in primary color, label above with small font, helper text below in text-secondary.

**Member Forms**: Multi-step with progress indicator at top, grouped fields in logical sections.

### Status Indicators
**Badges**: Pill-shaped (rounded-full), small text, appropriate semantic colors:
- Active/Present: Success green
- Pending: Warning amber
- Inactive/Absent: Error red
- Paid: Primary blue

**Warning System**: Tiered visual severity:
- Level 1: Amber border-l-4 on card
- Level 2: Orange with icon
- Level 3: Red with prominent alert style

### Voting Interface
**Ballot Cards**: Large tappable areas, radio buttons or checkboxes clearly visible, results shown as horizontal progress bars with percentages.

**Live Results**: Real-time updating cards with smooth transitions, participant count, time remaining countdown.

### Financial Dashboard
**Charts**: Use Chart.js/Recharts style visualizations - income/expense trends (line charts), category breakdown (donut charts), monthly comparisons (bar charts).

**Transaction List**: Timeline-style layout with date separators, amount in JetBrains Mono, category tags, search/filter toolbar.

### Room Assignment
**Calendar View**: Week/month grid with color-coded rooms, drag-drop visual feedback, occupancy percentage indicators.

**Room Cards**: Capacity meter, current assignment, amenities icons, booking button.

---

## Images

**Hero Section**: Professional meeting/club environment photo (1920x600px)
- Placement: Top of dashboard landing/welcome page
- Style: Subtle overlay gradient (220 85% 55% at 20% opacity) for text legibility
- Content overlay: "Welcome to GCC English Meetup" headline + quick stats row

**Empty States**: Friendly illustrations for:
- No members yet
- No upcoming meetings
- No voting sessions
- Zero transactions

**Member Avatars**: Circular (rounded-full), 40px standard size, 32px in lists, initials fallback with colored backgrounds.

---

## Interactions & Animations

**Micro-interactions**: 150ms ease-out transitions for hover states, 200ms for modal appearances, 300ms for sidebar collapse.

**Loading States**: Skeleton screens matching card layouts, subtle pulse animation.

**Notifications**: Toast notifications (top-right), slide-in from right, auto-dismiss after 4s, icon + message + action button.

---

## Page-Specific Layouts

**Dashboard Home**: 
- Hero with photo
- 4-column stats cards
- 2-column layout (upcoming meetings left, recent activity right)
- Charts section (2-column)

**Member Directory**:
- Search/filter bar with advanced filters
- Member cards grid (3-column)
- Quick actions on hover
- Pagination at bottom

**Attendance Tracking**:
- Meeting selector dropdown
- Searchable member list with checkboxes
- Bulk actions toolbar
- Statistics sidebar (present %, late count)

**Voting System**:
- Active polls as prominent cards
- Past polls archive in tabs
- Results with visual progress bars
- Admin controls clearly separated

**Financial Management**:
- Summary cards row
- Main chart area
- Filterable transaction table
- Export functionality prominent

All layouts maintain consistent 6-8 spacing between major sections, cards use 4-6 internal padding, generous whitespace for professional appearance.