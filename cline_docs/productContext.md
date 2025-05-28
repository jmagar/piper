# Product Context

## Why This Project Exists

Zola is being refactored from a multi-user, cloud-based chat application to a minimal, admin-only, single-user application. The goal is to create a local-only version that removes all internal authentication complexity, multi-user features, cloud dependencies, and real-time subscriptions, deployable via Docker. The application itself will not handle user login or session management.

## What Problems It Solves

- Eliminates the complexity of in-application multi-user authentication and authorization.
- Removes dependency on cloud services (Supabase, Clerk, etc.) for core functionality.
- Provides a simple, local-only chat interface for a single admin user, with data persisted reliably on the server using PostgreSQL and Prisma.
- Enables local file uploads without cloud storage restrictions (planned).
- Simplifies deployment to Docker environments or bare metal.

## How It Should Work

- Single admin user. Authentication is intended to be handled externally (e.g., by Authelia). The application assumes it's operating in an authenticated admin context.
- All features, including chat history and agent management, are always accessible without further in-app authentication checks.
- All data stored locally in a PostgreSQL database, accessed securely via server-side logic using the Prisma ORM.
- Client-side components fetch data through well-defined Next.js API Routes, ensuring no direct database access from the browser.
- File uploads will be saved to a local filesystem directory (`UPLOADS_DIR`).
- No user registration, password reset, or profile management *within* the application.
- Errors and key operations (like uploads) should be logged to both terminal and persistent log files (logging system to be fully implemented).
- Deployable via Docker Compose with minimal configuration, including environment variables for sensitive data.
- Aims for a clean, extensible codebase for future enhancements.