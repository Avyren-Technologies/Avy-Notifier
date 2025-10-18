# Technology Stack

## Frontend (Mobile App)
- **React Native 0.81.4** with **Expo 54.0.0** - Cross-platform mobile development
- **TypeScript** - Type-safe development with strict mode enabled
- **Expo Router 6.0.7** - File-based navigation system
- **NativeWind 4.1.23** - Tailwind CSS for React Native styling
- **TanStack Query 5.80.6** - Data fetching, caching, and synchronization
- **Zustand 5.0.3** - Lightweight state management
- **Expo Notifications 0.32.11** - Push notification handling
- **FlashList 2.0.2** - High-performance list rendering
- **ExcelJS & XLSX** - Excel report generation and manipulation

## Backend
- **Node.js with Express 5.1.0** - Server runtime and API framework
- **TypeScript 5.8.3** - Type-safe backend development
- **Prisma ORM 6.12.0** - Database access layer with PostgreSQL
- **JWT (jsonwebtoken 9.0.2)** - Authentication and authorization
- **Expo Server SDK 3.15.0** - Push notification service integration
- **ExcelJS 4.4.0** - Server-side Excel report generation
- **bcryptjs 3.0.2** - Password hashing
- **node-schedule 2.1.1** - SCADA polling scheduler

## Database
- **PostgreSQL** - Primary application database
- **External SCADA Database** - Real-time industrial data source (configurable per organization)

## Development Tools
- **ESLint** with Expo config - Code linting and formatting
- **Prettier 3.2.5** - Code formatting with Tailwind plugin
- **Nodemon** - Backend development server with hot reload
- **ts-node** - TypeScript execution for development

## Build & Deployment
- **Docker** - Backend containerization
- **GitHub Actions** - CI/CD pipeline
- **Azure App Service** - Cloud hosting
- **EAS Build** - Mobile app building and distribution

## Common Commands

### Development
```bash
# Start backend development server
cd backend && npm run dev

# Start mobile app development
npx expo start

# Run on specific platforms
npx expo start --android
npx expo start --ios
```

### Database Operations
```bash
# Run database migrations
cd backend && npm run migrate

# Generate Prisma client
cd backend && npx prisma generate

# Seed database (optional)
cd backend && npx prisma db seed
```

### Building
```bash
# Build backend for production
cd backend && npm run build

# Build mobile app for production
eas build -p android --profile production
eas build -p ios --profile production
```

### Code Quality
```bash
# Lint and format frontend
npm run lint
npm run format

# Lint backend
cd backend && npm run lint
```

## Environment Configuration
- Frontend: `.env` with `EXPO_PUBLIC_*` variables
- Backend: `.env` with database URLs, JWT secrets, and API keys
- Required: PostgreSQL connection, SCADA database config, Gemini AI key