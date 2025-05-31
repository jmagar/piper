<Climb>
  <header>
    <id>nzb8</id>
    <type>bug</type>
    <description>Investigate and fix "Failed to create chat" error in Piper application</description>
  </header>
  <newDependencies>None required - this is a debugging task using existing dependencies</newDependencies>
  <prerequisitChanges>We've already made one change to fix the server-side fetch in getChatsForUserInDb by using absolute URLs</prerequisitChanges>
  <relevantFiles>
    - lib/chat-store/chats/api.ts
    - app/api/create-chat/route.ts
    - app/api/create-chat/api.ts
    - lib/fetch.ts
    - middleware.ts
    - app/components/chat/chat.tsx
    - app/api/chat/route.ts
    - .env (for environment variable configuration)
  </relevantFiles>

  ## Problem Description
  
  When attempting to create a new chat in the Piper application, users encounter a "Failed to create chat" error. Server-side logs show `TypeError: Failed to parse URL from /api/create-chat` with error digest `1326885198`. The browser is making requests to `https://piper.tootie.tv` rather than the local development server at `http://localhost:8630`, further complicating diagnosis.

  ## Investigation Context

  ### Current Understanding
  
  1. **CSRF Protection Removed**: The custom CSRF implementation has been removed to simplify the system, as it's not needed with 2FA via Authelia.
  
  2. **Server-Side URL Resolution Issue**: There's a pattern of server-side code attempting to use relative URLs in `fetch` calls, which causes the "Failed to parse URL" errors. One instance in `getChatsForUserInDb` has been fixed by adding an absolute URL.
  
  3. **Browser/Server Mismatch**: The user's browser is accessing `https://piper.tootie.tv` while the local development server is running on `http://localhost:8630`, meaning local changes aren't being tested.
  
  4. **Request Path Anomaly**: Server logs show `POST / 500` for the error rather than the expected `POST /api/create-chat`, suggesting a non-standard request flow.
  
  5. **Multiple Server-Side Actions**: The application has Server Actions (functions with `"use server"` directive) that may be involved in the error flow.

  ## Investigation Goals
  
  1. Confirm the user is testing against the correct server (`http://localhost:8630`).
  
  2. Identify all instances of server-side code using relative URLs in `fetch` calls.
  
  3. Determine the exact request flow that leads to the "Failed to create chat" error.
  
  4. Develop and implement a comprehensive fix that addresses all identified issues.
  
  5. Verify the fix works in both development and production environments.

  ## Success Criteria
  
  1. Users can successfully create new chats without errors.
  
  2. Server logs show no URL parsing errors.
  
  3. All server-side `fetch` calls use absolute URLs.
  
  4. The application works correctly in both development and production environments.

  ## Technical Investigation Plan
  
  ### Phase 1: Environment Verification
  
  - Ensure `.env` file has the correct `NEXT_PUBLIC_APP_URL` setting
  - Confirm Docker rebuild and restart process properly incorporates environment changes
  - Verify browser access is to the correct URL (`http://localhost:8630`)
  
  ### Phase 2: Code Analysis
  
  - Systematically search for all server-side `fetch` calls using relative URLs
  - Review all Server Actions that might interact with chat creation
  - Analyze the `createNewChat` function flow and related components
  
  ### Phase 3: Fix Implementation
  
  - Modify all identified server-side `fetch` calls to use absolute URLs
  - Create a utility function for server-side fetches to ensure consistent URL handling
  - Update `.env` documentation to clarify the importance of `NEXT_PUBLIC_APP_URL`
  
  ### Phase 4: Testing and Verification
  
  - Test chat creation on local development environment
  - Verify no URL parsing errors appear in server logs
  - Confirm all fixes work with different browser contexts

  ## Implementation Considerations
  
  - Server-side `fetch` calls must use absolute URLs
  - Environment variables must be properly set and accessible
  - Docker rebuild is necessary to incorporate environment changes
  - Local testing must be done against `http://localhost:8630`, not `piper.tootie.tv`
</Climb> 