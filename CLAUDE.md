# Pooper Development Guide

## Commands

### Backend
```bash
# Development
pnpm run dev             # Start backend in watch mode
pnpm run dev:all         # Start both backend and frontend

# Testing
pnpm test                # Run all tests with Vitest
pnpm test:watch          # Run tests in watch mode
pnpm test path/file.test.ts  # Run specific test file

# Build & Lint  
pnpm run build           # Build with TypeScript
pnpm run lint            # Run ESLint
pnpm run lint:fix        # Fix ESLint issues

# Database
pnpm run db:push         # Push schema changes to database
pnpm run db:migrate      # Run migrations
pnpm run db:seed         # Seed database
```

### Frontend
```bash
pnpm run dev             # Start Next.js dev server (port 3002)
pnpm run build           # Build Next.js app
pnpm run lint            # Run Next.js ESLint
```

## Code Style

- **Formatting**: 2 spaces, 100 char line limit, prefer arrow functions
- **TypeScript**: Strict mode with no implicit any, prefer interfaces for objects
- **Imports**: Group by builtin → external → internal → parent → sibling → index
- **React**: Function components with hooks, named exports preferred
- **Error Handling**: Try/catch blocks for async, use error boundaries in React
- **Naming**: PascalCase for components/types, camelCase for variables/functions
- **Testing**: Write tests in parallel `.test.ts` files, 80% coverage target

This project is a Model Context Protocol client with Next.js frontend and Express backend.