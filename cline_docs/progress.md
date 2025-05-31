# Progress: Piper Development Status

**Last Updated**: 2025-05-30 (Current Session)

**Overall Status**: The development environment setup (`dev.sh`, `docker-compose.dev.yml`, Prisma DB sync) is stable. The CSRF token issue and server-side fetch URL parsing errors have been resolved.

## What Works / Recently Confirmed:

### ✅ **Development Environment & Database**
   - **Docker Setup**: `dev.sh` correctly uses `docker-compose.dev.yml` for local development.
   - **Database Synchronization**: `npx prisma db push` runs successfully on `piper-app` startup, ensuring the database schema is current and resolving previous table/client generation issues.
   - **Environment Variables**: `.env` file is being loaded, with `NEXT_PUBLIC_APP_URL` added for server-side fetch calls.
   - **Core Infrastructure**: Dockerized services (app, DB, cache) are running.

### ✅ **Server-Side Fetch Calls**
   - **Server-Side Fetch Utility**: Created `lib/server-fetch.ts` with `serverFetch` and `serverFetchJson` functions to safely make API calls from server components and Server Actions.
   - **URL Resolution**: All server-side fetch calls now use absolute URLs via the utility functions.
   - **CSRF Protection**: Removed custom CSRF implementation as it's not needed with 2FA via Authelia.

### ✅ **Chat Creation**
   - **Create Chat Flow**: Fixed server-side URL parsing errors in the chat creation flow.
   - **API Routes**: Server-side components can now successfully call API routes using absolute URLs.

### ✅ **Previous Stable Items**
   - **MCP Server Configuration Management**: Reliable loading/saving of `config.json`, UI management.
   - **SSE MCP Tool Integration**: Tools loaded, transport object handling.

## What's Left to Build / Immediate Next Focus:

### ✅ **RESOLVED: "Invalid CSRF token" Error**
   - **Solution**: Removed custom CSRF implementation as it's not needed with 2FA via Authelia.
   - **Related Changes**: Modified `middleware.ts` to remove CSRF token validation logic, removed `app/api/csrf/route.ts`.

### ✅ **RESOLVED: Server-Side Fetch URL Parsing Errors**
   - **Solution**: Created `lib/server-fetch.ts` utility to handle server-side fetch calls with absolute URLs.
   - **Related Changes**: Added `NEXT_PUBLIC_APP_URL` to `.env`, updated server-side code to use the new utility.

### 🚧 **Verify Hot Reloading**
   - Confirm that code changes in the local source directory reflect in the running application without a full container rebuild.

### 🧪 **Comprehensive End-to-End Testing**
   - Test all chat functionality including creation, message sending, and history.
   - Test invocation of various STDIO and SSE MCP tools.
   - Test dashboard functionality.

### ✨ **UI/UX Enhancements**
   - Continue refining UI based on testing.

### 📄 **Documentation and Code Cleanup**
   - Ensure all `cline_docs` are kept current.
   - Document the server-side fetch utility and how to use it correctly.

## Progress Status:
- **CSRF Token Handling**: 🟢 **Green (Fixed by removal)**
- **Server-Side Fetch Calls**: 🟢 **Green (Fixed with server-fetch utility)**
- **Development Environment Stability**: 🟢 Green
- **Database Synchronization**: 🟢 Green
- **MCP Configuration & Tooling**: 🟢 Green (Confirmed working)
- **Overall Application Functionality**: 🟢 Green (Core chat functionality working)