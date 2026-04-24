# Avy Notifier Web Dashboard - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a best-in-class web version of the Avy Notifier mobile app as a Next.js 16 dashboard with sidebar navigation, connecting to the same backend API.

**Architecture:** Next.js 16 App Router with client-side rendering for dashboard pages. Sidebar layout with role-based navigation. All API calls go through a shared axios instance with JWT auth. React Query for server state, Zustand for client state, Recharts for data visualization.

**Tech Stack:** Next.js 16.2.4, React 19, TypeScript 5, Tailwind CSS 4, Radix UI, Recharts, Framer Motion, Axios, TanStack React Query, Zustand, date-fns, Lucide React, Sonner

**Backend API:** `https://Avy-I-server-eyckc9gmbvf7bqgq.centralindia-01.azurewebsites.net`

---

## File Structure

```
avy-notifier/app/
├── layout.tsx                          # Root layout (providers, fonts, metadata)
├── page.tsx                            # Landing → redirect to /login or /dashboard
├── globals.css                         # Tailwind + custom CSS variables + theme
├── login/page.tsx                      # Login screen
├── select-app/page.tsx                 # App type selection (Furnace/Meter)
├── dashboard/
│   ├── layout.tsx                      # Dashboard shell (sidebar + header + main)
│   ├── page.tsx                        # Redirect based on app type
│   ├── operator/page.tsx               # Furnace alarm monitoring
│   ├── meter-readings/page.tsx         # Meter parameter monitoring
│   ├── analytics/page.tsx              # Alarm analytics & charts
│   ├── alarms/page.tsx                 # Alarm history
│   ├── reports/page.tsx                # Report generation & management
│   ├── notifications/page.tsx          # Notification center
│   ├── profile/page.tsx                # Profile & settings
│   └── admin/
│       ├── users/page.tsx              # User management (admin)
│       ├── meter-limits/page.tsx       # Meter parameter limits
│       ├── setpoints/page.tsx          # Setpoint configuration
│       ├── organizations/page.tsx      # Organization management (super admin)
│       └── super-users/page.tsx        # Super admin user management
├── lib/
│   ├── api-client.ts                   # Axios instance with interceptors
│   ├── auth.ts                         # Auth API functions
│   ├── utils.ts                        # cn() helper, misc utilities
│   └── timezone.ts                     # IST timezone conversion utils
├── types/
│   ├── auth.ts                         # User, AuthState, LoginCredentials
│   ├── alarm.ts                        # Alarm, AlarmSeverity, AlarmStatus
│   ├── notification.ts                 # Notification, NotificationSettings
│   ├── meter.ts                        # MeterReading, MeterLimit, MeterReport
│   └── organization.ts                 # Organization, SuperAdminMetrics
├── hooks/
│   ├── use-alarms.ts                   # Active alarms, history, analytics
│   ├── use-notifications.ts            # Notifications CRUD
│   ├── use-meter-readings.ts           # Meter data hooks
│   ├── use-meter-reports.ts            # Meter report generation
│   ├── use-furnace-reports.ts          # Furnace report generation
│   ├── use-organizations.ts            # Organization CRUD (super admin)
│   ├── use-setpoints.ts               # Setpoint config hooks
│   ├── use-super-admin.ts             # Super admin metrics + users
│   └── use-alarm-report-data.ts       # Alarm report data fetching
├── store/
│   ├── alarm-store.ts                  # Zustand alarm store
│   └── meter-report-store.ts           # Zustand meter report store
├── context/
│   ├── auth-context.tsx                # Auth provider (JWT, login, logout)
│   ├── theme-context.tsx               # Dark/light mode provider
│   └── maintenance-context.tsx         # Maintenance mode provider
├── components/
│   ├── ui/                             # Base UI components (button, input, card, etc.)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── modal.tsx
│   │   ├── select.tsx
│   │   ├── switch.tsx
│   │   ├── tabs.tsx
│   │   ├── tooltip.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   ├── avatar.tsx
│   │   ├── progress.tsx
│   │   ├── checkbox.tsx
│   │   ├── skeleton.tsx
│   │   └── data-table.tsx
│   ├── layout/
│   │   ├── sidebar.tsx                 # Main sidebar navigation
│   │   ├── header.tsx                  # Top header with search, notifications, profile
│   │   └── breadcrumbs.tsx             # Page breadcrumbs
│   ├── charts/
│   │   ├── alarm-chart.tsx             # Analog alarm line chart
│   │   ├── meter-chart.tsx             # Meter readings line chart
│   │   └── stats-chart.tsx             # Statistics bar/pie charts
│   ├── alarm-card.tsx                  # Individual alarm display card
│   ├── alarm-details-modal.tsx         # Alarm detail + actions modal
│   ├── resolution-modal.tsx            # Resolution message modal
│   ├── setpoint-config-modal.tsx       # Setpoint deviation config
│   ├── report-generator.tsx            # Furnace report generation modal
│   ├── meter-report-generator.tsx      # Meter report generation modal
│   ├── notification-badge.tsx          # Unread count badge
│   ├── time-range-picker.tsx           # Mute hours picker
│   └── providers.tsx                   # Combined context providers wrapper
```

---

## Task Breakdown

### Task 1: Core Infrastructure - Types, API Client, Utilities
**Files:** Create `lib/api-client.ts`, `lib/auth.ts`, `lib/utils.ts`, `lib/timezone.ts`, `types/auth.ts`, `types/alarm.ts`, `types/notification.ts`, `types/meter.ts`, `types/organization.ts`

Port all TypeScript types from mobile app. Create axios instance with JWT interceptors. Port timezone utilities adapted for web (no expo-secure-store, use localStorage).

### Task 2: Context Providers - Auth, Theme, Maintenance
**Files:** Create `context/auth-context.tsx`, `context/theme-context.tsx`, `context/maintenance-context.tsx`, `components/providers.tsx`

Port AuthContext (replace SecureStore with localStorage, remove push token logic). Port ThemeContext (use CSS variables + localStorage). Port MaintenanceContext. Create combined Providers wrapper with QueryClientProvider.

### Task 3: UI Component Library
**Files:** Create all files under `components/ui/`

Build reusable UI components using Radix UI primitives + Tailwind. Components: Button, Input, Card, Badge, Modal, Select, Switch, Tabs, Tooltip, DropdownMenu, ScrollArea, Separator, Avatar, Progress, Checkbox, Skeleton, DataTable.

### Task 4: Dashboard Layout - Sidebar, Header, Shell
**Files:** Create `components/layout/sidebar.tsx`, `components/layout/header.tsx`, `components/layout/breadcrumbs.tsx`, `dashboard/layout.tsx`

Build sidebar with role-based navigation, collapsible groups, active state highlighting. Build header with notification badge, profile dropdown, theme toggle. Wire up as dashboard layout.

### Task 5: Root Layout, Global Styles, Landing Page
**Files:** Modify `layout.tsx`, `globals.css`, `page.tsx`. Create `login/page.tsx`.

Update root layout with providers. Add comprehensive CSS variables for the design system. Build the login page with email/password form, validation, error handling. Landing page redirects to login or dashboard based on auth state.

### Task 6: App Selection & Dashboard Entry
**Files:** Create `select-app/page.tsx`, modify `dashboard/page.tsx`

Build app type selection (Furnace/Meter) page. Dashboard index redirects to operator or meter-readings based on selected app type.

### Task 7: Zustand Stores
**Files:** Create `store/alarm-store.ts`, `store/meter-report-store.ts`

Port Zustand stores from mobile. Same state shape and actions.

### Task 8: React Query Hooks - Alarms & Notifications
**Files:** Create `hooks/use-alarms.ts`, `hooks/use-notifications.ts`

Port alarm hooks (useActiveAlarms, useUpdateAlarmStatus, useAlarmHistory, useAnalyticsData, useAlarmConfigurations). Port notification hooks (useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, useDeleteNotification, useUpdateNotificationSettings).

### Task 9: React Query Hooks - Meter & Reports
**Files:** Create `hooks/use-meter-readings.ts`, `hooks/use-meter-reports.ts`, `hooks/use-furnace-reports.ts`, `hooks/use-alarm-report-data.ts`, `hooks/use-setpoints.ts`, `hooks/use-organizations.ts`, `hooks/use-super-admin.ts`

Port all remaining hooks. Adapt file operations for web (Blob API instead of expo-file-system).

### Task 10: Shared Components - Alarm Cards, Modals, Charts
**Files:** Create `components/alarm-card.tsx`, `components/alarm-details-modal.tsx`, `components/resolution-modal.tsx`, `components/setpoint-config-modal.tsx`, `components/notification-badge.tsx`, `components/charts/alarm-chart.tsx`, `components/charts/meter-chart.tsx`, `components/charts/stats-chart.tsx`

Port all shared components from mobile. Replace React Native components with HTML/Tailwind equivalents. Use Recharts instead of custom Canvas drawing.

### Task 11: Operator Dashboard (Furnace Monitoring)
**Files:** Create `dashboard/operator/page.tsx`

Build the main furnace monitoring screen: summary cards (critical/warning/info counts), analog alarms section, binary alarms section, severity filtering, alarm acknowledgment/resolution, setpoint config (admin), real-time refresh. Reference: mobile `app/(dashboard)/operator/index.tsx`.

### Task 12: Meter Readings Dashboard
**Files:** Create `dashboard/meter-readings/page.tsx`

Build meter monitoring screen: live parameter cards (voltage, current, frequency, PF, energy, power), timeframe selector, interactive line chart, recent readings table, limit configuration (admin). Reference: mobile `app/(dashboard)/meter-readings/index.tsx`.

### Task 13: Analytics Screen
**Files:** Create `dashboard/analytics/page.tsx`

Build analytics with alarm trend charts, setpoint visualization, threshold indicators, time range selection. Reference: mobile `app/(dashboard)/analytics/index.tsx`.

### Task 14: Alarm History Screen
**Files:** Create `dashboard/alarms/page.tsx`

Build alarm history with date grouping, severity filtering, search, alarm detail modals. Reference: mobile `app/(dashboard)/alarms/history.tsx`.

### Task 15: Reports Screen
**Files:** Create `dashboard/reports/page.tsx`, `components/report-generator.tsx`, `components/meter-report-generator.tsx`

Build report management: report list, generation modals (furnace + meter), Excel download, filtering. Reference: mobile `app/(dashboard)/reports/index.tsx`.

### Task 16: Notifications Screen
**Files:** Create `dashboard/notifications/page.tsx`

Build notification center: grouped by date, mark as read, mark all read, delete, source filtering (Meter/Furnace), infinite scroll. Reference: mobile `app/(dashboard)/notifications/index.tsx`.

### Task 17: Profile & Settings Screen
**Files:** Create `dashboard/profile/page.tsx`, `components/time-range-picker.tsx`

Build profile page: user info editing, password change, avatar upload, notification settings, theme toggle, maintenance mode (admin). Reference: mobile `app/(dashboard)/profile/index.tsx`.

### Task 18: Admin - User Management
**Files:** Create `dashboard/admin/users/page.tsx`

Build user CRUD: list, create, edit, delete users. Role assignment. Reference: mobile `app/(dashboard)/screens/admin/users/index.tsx`.

### Task 19: Admin - Meter Limits & Setpoints
**Files:** Create `dashboard/admin/meter-limits/page.tsx`, `dashboard/admin/setpoints/page.tsx`

Build meter limit configuration and setpoint deviation configuration screens. Reference: mobile admin screens.

### Task 20: Super Admin Screens
**Files:** Create `dashboard/admin/organizations/page.tsx`, `dashboard/admin/super-users/page.tsx`

Build organization management (SCADA config, schema mapping, JSON validation) and global user management. Reference: mobile `app/components/OrganizationManagement.tsx` and `SuperAdminUserManagement.tsx`.
