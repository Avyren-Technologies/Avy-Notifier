# Project Structure & Organization

## Root Level Organization
```
Eagle-Notifier/
├── app/                    # React Native mobile application
├── backend/                # Node.js Express server
├── assets/                 # Static assets (images, fonts, sounds)
├── constants/              # Configuration files (Firebase, etc.)
├── database/               # Database schema documentation
├── cursorUpdates/          # Development documentation and updates
├── learn/                  # Learning guides and documentation
└── temp/                   # Temporary files and workflows
```

## Mobile App Structure (`app/`)
- **File-based routing** with Expo Router
- **Grouped routes**: `(auth)` for authentication, `(dashboard)` for main app
- **Role-based screens**: Different layouts for operators, admins, super admins
- **Feature organization**: Each major feature has its own folder (alarms, meter-readings, etc.)

### Key App Directories
```
app/
├── (auth)/                 # Authentication screens
├── (dashboard)/            # Main application screens
│   ├── alarms/            # Alarm management
│   ├── meter-readings/    # Electrical parameter monitoring
│   ├── notifications/     # Push notification management
│   ├── screens/admin/     # Admin-only screens
│   └── superAdmin/        # Super admin screens
├── api/                   # API client configuration and services
├── components/            # Reusable UI components
├── context/               # React context providers
├── hooks/                 # Custom React hooks
├── services/              # Business logic services
├── store/                 # Zustand state management
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

## Backend Structure (`backend/`)
- **Layered architecture**: Routes → Controllers → Services → Database
- **Prisma ORM**: Database schema and migrations in `prisma/`
- **Modular routes**: Separate route files for different features
- **Middleware**: Authentication, error handling, rate limiting

### Key Backend Directories
```
backend/
├── src/
│   ├── config/            # Database and external service configuration
│   ├── middleware/        # Express middleware (auth, error handling)
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic and external integrations
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── prisma/                # Database schema and migrations
└── server.ts              # Application entry point
```

## Naming Conventions

### Files & Folders
- **PascalCase**: React components (`AlarmCard.tsx`, `UserManagement.tsx`)
- **camelCase**: Utilities, hooks, services (`useAlarms.ts`, `reportService.ts`)
- **kebab-case**: Route folders (`meter-readings/`, `push-notifications/`)
- **lowercase**: Configuration files (`package.json`, `tsconfig.json`)

### Code Conventions
- **Interfaces**: PascalCase with descriptive names (`User`, `AlarmData`, `ApiResponse`)
- **Enums**: PascalCase for enum, UPPER_CASE for values (`UserRole.SUPER_ADMIN`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `DEFAULT_TIMEOUT`)
- **Functions**: camelCase with verb-noun pattern (`getUserById`, `processAlarmData`)

## Multi-Tenant Architecture
- **Organization isolation**: All data queries include `organizationId`
- **Role-based access**: Three-tier system (SUPER_ADMIN, ADMIN, OPERATOR)
- **Database design**: Foreign key relationships ensure data isolation
- **API routes**: Middleware enforces organization-based access control

## Configuration Management
- **Environment variables**: Separate `.env` files for frontend and backend
- **Type safety**: Environment variables typed in TypeScript
- **Fallback values**: Production URLs as defaults for missing env vars
- **Multi-environment**: Development, staging, and production configurations

## Development Patterns

### State Management
- **Zustand**: Lightweight stores for complex state (alarms, reports)
- **TanStack Query**: Server state management and caching
- **React Context**: Authentication and theme state
- **Local state**: Component-level state with useState/useReducer

### Error Handling
- **Centralized**: Error boundary components catch React errors
- **API errors**: Consistent error response format across all endpoints
- **User feedback**: Toast notifications and error states in UI
- **Logging**: Structured logging for debugging and monitoring

### Performance Optimization
- **FlashList**: High-performance lists for large datasets
- **Lazy loading**: Route-based code splitting with Expo Router
- **Caching**: TanStack Query for API response caching
- **Virtualization**: Large lists use virtualized rendering

## Testing Strategy
- **Unit tests**: Jest for utility functions and business logic
- **Integration tests**: API endpoint testing with supertest
- **E2E tests**: Expo testing tools for critical user flows
- **Type checking**: TypeScript strict mode for compile-time safety