# AI SDK 5 Alpha Migration Analysis (Preliminary)

This document outlines the initial findings for migrating the Zola project to AI SDK 5 Alpha. The analysis is based on the AI SDK 5 Alpha announcement and a review of key codebase sections.

**Note:** This is a preliminary analysis. Priorities, complexities, and effort estimations will become more accurate as the migration progresses and more details of AI SDK 5 Alpha are understood.

## 1. Dependency Updates

### File: `package.json`

-   **Current Dependencies (relevant to AI SDK):**
    -   `@ai-sdk/anthropic`: `^1.2.12`
    -   `@ai-sdk/google`: `^1.2.18`
    -   `@ai-sdk/mistral`: `^1.2.8`
    -   `@ai-sdk/openai`: `^1.3.22`
    -   `@ai-sdk/xai`: `^1.2.16`
    -   `@openrouter/ai-sdk-provider`: `^0.5.0`
    -   `ai`: `^4.3.13`
-   **AI SDK 5 Alpha Action:**
    -   Update all `ai` and `@ai-sdk/*` packages to their respective `@alpha` versions (e.g., `ai@alpha`, `@ai-sdk/openai@alpha`).
    -   Verify compatibility or alpha versions for third-party providers like `@openrouter/ai-sdk-provider`.
-   **Priority:** Critical
-   **Complexity:** Low (for package updates themselves) to Medium (if provider compatibility issues arise).

## 2. Server-Side Chat API (`/api/chat`)

### File: `app/api/chat/route.ts`

-   **Key Changes Required:**
    1.  **Input Message Handling:** The `messages` received in the request body (currently `MessageAISDK[]`) will be `UIMessage[]` if the client sends them in the new format, or will need to be handled appropriately if the client is updated first. The core change is that before passing to the model, messages must be converted using `convertToModelMessages(messages)`.
    2.  **Output Streaming:** Use `result.toUIMessageStreamResponse()` (where `result` is from `streamText` or similar) to return the stream. This leverages the new UI Message Stream feature, allowing for richer data like `UIMessage` parts.
    3.  **`onFinish` in `streamText`:** The `response.messages` within `onFinish` will likely be `ModelMessage[]` or a related new type. The current logic for `storeAssistantMessage` needs to adapt to this new structure.
    4.  **Tool Usage & Agentic Control:** Review current tool usage (`ToolSet`). AI SDK 5 introduces `prepareStep` and `continueUntil` for finer agentic control. This is an opportunity for enhancement.
-   **Priority:** Critical
-   **Complexity:** High (core API logic, message transformations, adopting new streaming methods).
-   **Potential Gains:** Access to new streaming features (data parts, metadata), improved type safety, foundation for advanced agentic behavior.

## 3. Client-Side Chat Component & Message Management

### File: `app/components/chat/chat.tsx`

-   **Key Changes Required:**
    1.  **`useChat` Initialization:** 
        -   Import `defaultChatStore` (or equivalent) from `ai@alpha`.
        -   Initialize `useChat` by passing a `chatStore` instance (e.g., `useChat({ chatStore: defaultChatStore({ api: API_ROUTE_CHAT, ... }) })`).
    2.  **Message Types:** The `messages` array from `useChat`, `initialMessages` prop, and the `message` in `onFinish` will all be `UIMessage` or expect `UIMessage[]`.
        -   Ensure rendering logic and any functions consuming these messages (e.g., `cacheAndAddMessage`) handle the `UIMessage` structure (especially `message.parts`).
-   **Priority:** Critical
-   **Complexity:** Medium

### File: `lib/chat-store/messages/provider.tsx` (Manages local message state and IndexedDB caching)

-   **Key Changes Required:**
    1.  **Internal State & Types:** 
        -   Change `useState<MessageAISDK[]>` to `useState<UIMessage[]>`. 
        -   Update `MessagesContextType` and all internal references from `MessageAISDK` to `UIMessage`.
    2.  **`cacheAndAddMessage` function:** 
        -   Signature: `async (message: UIMessage) => {...}`.
        -   Ensure `writeToIndexedDB` stores data in `UIMessage` format.
    3.  **Message Loading & IndexedDB Migration (CRITICAL POINT):**
        -   The `useEffect` hook loads messages using `getCachedMessages(chatId)` (from IndexedDB) and then fetches from `/api/messages/${chatId}`.
        -   **`getCachedMessages`:** If existing messages in IndexedDB are in the old `MessageAISDK` format, a **conversion function** (e.g., `convertLegacyMessageToUIMessage(legacyMessage): UIMessage`) **must** be implemented and used when loading these cached messages. New messages should be saved as `UIMessage` by `cacheAndAddMessage`.
        -   **Fetching from `/api/messages/${chatId}`:** This API endpoint (if custom) must be updated to return `UIMessage[]`. If it's a standard persistence endpoint, verify its compatibility.
    4.  **Other utility functions** (`saveAllMessages`, etc.): Update to use `UIMessage`.
-   **Priority:** Critical (for type updates and especially IndexedDB migration strategy).
-   **Complexity:** Medium to High (primarily due to the IndexedDB data conversion/migration).

### File: `lib/chat-store/messages/api.ts` & `lib/chat-store/persist.ts` (IndexedDB Interaction & Migration)

-   **`lib/chat-store/persist.ts` (`idb-keyval` wrapper):**
    -   Uses `idb-keyval`, which can store and retrieve complex JavaScript objects like `UIMessage` (including its `parts` array) without structural issues. The functions `readFromIndexedDB` and `writeToIndexedDB` in `persist.ts` do not need modification to handle the `UIMessage` structure itself; they will correctly store/retrieve what they are given.
    -   **IndexedDB Data Migration Strategies (handling existing `MessageAISDK` data):**
        1.  **Via `onupgradeneeded` (in `persist.ts`'s `initDatabase` function):**
            -   Increment `DB_VERSION` in `persist.ts` (e.g., from 2 to 3).
            -   In the `request.onupgradeneeded` handler (when `event.oldVersion < newVersion`), implement logic to iterate through all existing message entries in the "messages" object store (using raw IndexedDB APIs like cursors and transactions).
            -   For each entry, convert its `MessageAISDK[]` (within the stored `ChatMessageEntry` structure) to `UIMessage[]` using the `convertLegacyMessageToUIMessage` utility function.
            -   Update the entry in the object store with the new `UIMessage[]` data.
            -   **Pros:** Standard, clean way for IndexedDB schema/data changes. Data is migrated before the app fully uses it.
            -   **Cons:** More complex to implement correctly within `onupgradeneeded`, requiring careful use of raw IndexedDB APIs.
        2.  **In-Application Bulk Conversion (e.g., triggered from `provider.tsx` or app startup):**
            -   On application startup (e.g., after `initDatabaseAndStores` from `persist.ts` completes), or once per user session after an update (requiring a flag to prevent re-runs):
            -   Read all relevant message entries from IndexedDB (e.g., using `readFromIndexedDB` or `idb-keyval`'s `getMany` after fetching keys).
            -   Perform the conversion from `MessageAISDK[]` to `UIMessage[]` in JavaScript for each entry.
            -   Write all converted entries back to IndexedDB (e.g., using `writeToIndexedDB` or `idb-keyval`'s `setMany`).
            -   **Pros:** Potentially simpler to implement using existing abstraction layers over IndexedDB.
            -   **Cons:** Can be slow on first load post-update for users with many messages. Less clean than `onupgradeneeded`.

-   **`lib/chat-store/messages/api.ts` (Contains client-side cache accessors & server-side DB logic):**
    -   **`getCachedMessages` (Client-side IndexedDB read):**
        -   If a bulk migration (e.g., via `onupgradeneeded`) is performed, this function can assume data retrieved from `readFromIndexedDB` is already in the new `ChatMessageEntry { messages: UIMessage[] }` format.
        -   If no bulk migration is done, or for robustness during a transition, this function must:
            -   Read the (potentially old) `ChatMessageEntry` (which might contain `messages: MessageAISDK[]`).
            -   Detect if `entry.messages` needs conversion (e.g., by checking if `message.parts` is undefined on the first message).
            -   If conversion is needed, map over `entry.messages` applying `convertLegacyMessageToUIMessage(legacyMsg)`.
            -   Return `Promise<UIMessage[]>`.
    -   **`cacheMessages` (Client-side IndexedDB write):**
        -   Signature changes to accept `messages: UIMessage[]`.
        -   Will correctly store the `ChatMessageEntry { id: chatId, messages: UIMessage[] }` structure via `writeToIndexedDB`.
    -   **Server-Side Database Functions (`getMessagesFromDb`, `insertMessageToDb`, etc.):**
        -   These functions are marked "server-only" and use Prisma to interact with the PostgreSQL database.
        -   They **must** be updated to handle `UIMessage` instead of `MessageAISDK`.
        -   **CRITICAL IMPACT: Prisma Schema Update.** The existing Prisma schema for messages (if it mirrors `MessageAISDK` with a simple `content: string`) needs significant modification. The `UIMessage.parts` array (which can contain various structured objects like text, tool calls, tool results, or data payloads) will likely require storing as a JSONB type field in PostgreSQL or be broken out into related tables. This is a major backend and database schema change.

### File: `prisma/schema.prisma` (Database Schema Definition)

-   **Current `Message` Model:**
    ```prisma
    model Message {
      id        String   @id @default(uuid())
      chat      Chat     @relation(fields: [chatId], references: [id])
      chatId    String
      content   String   // Simple string content
      role      String
      createdAt DateTime @default(now())
    }
    ```
-   **Problem:** The `content: String` field is insufficient for storing `UIMessage.parts`, which is an array of structured objects (text, tool calls, data, etc.).
-   **Recommended Solution (Using JSONB for `parts`):**
    -   Modify the `Message` model to replace `content: String` with `parts: Json`. Prisma's `Json` type maps to `jsonb` in PostgreSQL, which is suitable for storing structured array data.
    -   **Proposed `Message` Model:**
        ```prisma
        model Message {
          id        String   @id @default(uuid())
          chat      Chat     @relation(fields: [chatId], references: [id])
          chatId    String
          // content   String // To be removed or repurposed if necessary
          parts     Json     // New field to store UIMessage.parts array
          role      String
          createdAt DateTime @default(now())
          // Consider adding other UIMessage top-level fields if they are scalar and needed
        }
        ```
-   **Database Migration Steps:**
    1.  **Update `schema.prisma`:** Apply the changes to the `Message` model as shown above.
    2.  **Create Prisma Migration:** Run `npx prisma migrate dev --name update_message_for_ai_sdk_5`. This will generate the SQL to alter the `Message` table (e.g., drop `content` column, add `parts` column of type `jsonb`).
    3.  **Data Migration (for existing messages):** The schema migration only changes the table structure. Existing data needs to be transformed. Create and run a separate data migration script (e.g., a TypeScript script using Prisma Client, executed via `npx prisma db execute --file your_script.ts` or run as a standalone script):
        -   The script should fetch all existing messages.
        -   For each message, convert its old `content: String` into a `UIMessage.parts` array format (e.g., `[{ type: 'text', value: message.content }]`).
        -   Update the message record, setting its new `parts` field with the converted array.
-   **Impact:** This is a significant backend change affecting the database schema and requiring careful data migration to preserve existing message history in the new format.
-   **Other `UIMessage` fields:** Review the `UIMessage` interface from `ai@alpha` for any other top-level scalar fields (e.g., `language`) that might need to be added to the Prisma model.

### File: `app/api/messages/[chatId]/route.ts` (API for Fetching Stored Messages)

-   **Functionality:** This route handles `GET` requests to fetch all messages for a specific `chatId` from the database.
-   **Implementation:** It uses `getMessagesFromDb(chatId)` from `lib/chat-store/messages/api.ts` to retrieve messages and returns them as a JSON response.
-   **AI SDK 5 Alpha Impact:**
    -   This route itself requires **minimal to no direct code changes**.
    -   Its correct functioning depends entirely on the successful refactoring of:
        1.  The `getMessagesFromDb` function (in `lib/chat-store/messages/api.ts`) to fetch messages based on the updated Prisma schema (with `parts: Json`) and to return data structured as `UIMessage[]`.
        2.  The Prisma `Message` model in `prisma/schema.prisma` being updated to use `parts: Json`.
        3.  The database having undergone schema and data migration.
    -   Once `getMessagesFromDb` returns `UIMessage[]`, this API endpoint will automatically serve the messages in the new format to the client (`MessagesProvider`).
-   **Priority:** Low (for direct changes to this file), but High (for its dependency on underlying refactoring).
-   **Complexity:** Low (for direct changes), High (for dependencies).

## 5. Agentic Features & Tooling

This section analyzes how agents and tools are currently defined and managed, and how they align with AI SDK 5 Alpha's new agentic control primitives and tool definition standards.

### File: `lib/agents/load-agent.ts` (Agent Loading Logic)

-   **Functionality:** The `loadAgent(agentId: string)` function fetches agent configurations from the database using Prisma (`prisma.agent.findUnique`).
-   **Tool Resolution:**
    -   It retrieves an array of tool IDs from the `agent.tools` field (a `String[]` in the Prisma schema).
    -   It resolves these tool IDs against a central `TOOL_REGISTRY` (imported from `lib/tools/index.ts`).
    -   It performs an availability check for each tool using a `tool.isAvailable?.()` method.
-   **Output:** Returns an object containing `systemPrompt`, resolved `tools` (this becomes `toolsToUse` in `app/api/chat/route.ts`), a hardcoded `maxSteps`, and `mcpConfig`.
-   **AI SDK 5 Alpha Impact:** The core logic of fetching agent data can remain. The key is the structure of the resolved `tools` and how they are passed to the AI SDK.

### File: `lib/tools/index.ts` & `lib/tools/exa/index.ts` (Tool Registry)

-   **`TOOL_REGISTRY`:** Defined in `lib/tools/index.ts`, it aggregates tool definitions from sub-modules (e.g., `exaTools` from `lib/tools/exa/index.ts`).
-   **`exaTools`:** Defined in `lib/tools/exa/index.ts`, it further composes tools like `exa.webSearch` and `exa.crawl` by spreading imported tool objects (e.g., `webSearchTool` from `./webSearch/tool.ts`) and adding an `isAvailable` method based on environment variable checks.

### Files: `lib/tools/exa/webSearch/tool.ts` & `lib/tools/exa/crawl/tool.ts` (Individual Tool Definitions)

-   **Current Structure (Example: `webSearchTool`):**
    ```typescript
    import { tool } from "ai" // Likely from older 'ai' or custom utility
    import { z } from "zod"
    import { runWebSearch } from "./run"

    export const webSearchTool = tool({
      id: "exa.webSearch" as const,
      description: "Search the web...",
      parameters: z.object({
        query: z.string().describe("Search query"),
        numResults: z.number().optional().describe("Number of results (default: 5)"),
      }),
      async execute({ query, numResults }) {
        return await runWebSearch({ query, numResults })
      },
    })
    ```
-   **High Compatibility with AI SDK 5 Alpha:**
    -   **Zod Schemas for `parameters`:** Tools already use `zod` to define their input parameters. This is **perfectly aligned** with AI SDK 5 Alpha's requirements for tool definitions.
    -   **`execute` Method:** The `async execute({ param1, param2 })` signature with destructured, typed parameters is also **perfectly aligned**.
-   **Minor Adaptation Needed for AI SDK 5 Alpha:**
    -   The `tool()` wrapper function (imported as `import { tool } from "ai"`) is likely from an older version of the SDK or a custom utility. AI SDK 5 Alpha generally expects tools to be defined as plain JavaScript objects directly within the `tools` property of functions like `streamText` or `generateText`.
    -   **Action:** When constructing the `tools` object for AI SDK 5 Alpha functions (e.g., in `app/api/chat/route.ts`), you will use the `id` of each tool (e.g., `"exa.webSearch"`) as the key, and the inner object (containing `description`, `parameters`, `execute`) as the value. The `tool()` wrapper itself will likely be removed from the final structure passed to the AI SDK.
        ```typescript
        // Example of how tools would be structured for AI SDK 5 Alpha's streamText
        const toolsForAISDK5 = {
          'exa.webSearch': {
            description: webSearchTool.description,
            parameters: webSearchTool.parameters, // This is already a Zod schema
            execute: webSearchTool.execute
          },
          'exa.crawl': {
            description: crawlTool.description,
            parameters: crawlTool.parameters, // Already a Zod schema
            execute: crawlTool.execute
          }
          // ... other resolved tools
        };
        ```
-   **Overall Tool Migration Effort:** Due to the existing use of Zod and compatible `execute` signatures, the effort to migrate tool *definitions* is **low**. The main change is in how these definitions are collected and passed to the AI SDK 5 Alpha model functions.

### Agentic Loop with New Primitives (`prepareStep`, `continueUntil`)

-   The `maxSteps: 5` returned by `loadAgent` suggests a controlled execution loop for the agent.
-   AI SDK 5 Alpha's `prepareStep(result)` and `continueUntil(result)` primitives are designed for building robust agentic loops.
-   **Implementation in `app/api/chat/route.ts` would involve:**
    1.  Initial call to `streamText` (or `generateText`) with the user query, system prompt, message history, and the (adapted) `toolsForAISDK5`.
    2.  Use `prepareStep(result)` to get the model's output: `text`, `toolCalls`, `finishReason`.
    3.  Append any `text` from the assistant to the message history (as a `UIMessage` part).
    4.  If `toolCalls` are present:
        -   Iterate through `toolCalls`.
        -   For each `toolCall`, find the corresponding tool definition in `toolsForAISDK5`.
        -   Execute the tool's `execute` method with `toolCall.args`.
        -   Create `ToolResultMessage`s with the outcomes.
        -   Append `toolCalls` (as `UIMessage` parts) and `ToolResultMessage`s to the message history.
    5.  Check `maxSteps` or other custom conditions.
    6.  Use `continueUntil(result)` (e.g., `continueUntil({ finishReason: 'tool-calls' })`) to determine if the agent should run again with the updated message history.
    7.  If continuing, repeat from step 1 (or a variant that just sends new messages).
-   This explicit loop provides finer control over tool execution, state management, and intermediate model responses compared to the more implicit tool handling in previous SDK versions.

## 4. General Recommendations & Approach

-   **Install Alpha Packages:** Update `ai` and `@ai-sdk/*` packages to their respective `@alpha` versions. Pin exact versions.
-   **Iterative Refactoring Plan:**
    1.  **Core Message Types & Storage:** Start with `lib/chat-store/messages/provider.tsx`. Update types to `UIMessage`. Implement the IndexedDB data conversion strategy for `getCachedMessages`. Ensure `cacheAndAddMessage` saves in the new format.
    2.  **Server-Side API:** Modify `app/api/chat/route.ts` to use `convertToModelMessages` and `toUIMessageStreamResponse`.
    3.  **Client-Side `useChat`:** Update `app/components/chat/chat.tsx` to initialize `useChat` with `ChatStore` and ensure it correctly handles `UIMessage` for `initialMessages`, `messages`, and `onFinish`.
-   **Type Safety:** Utilize TypeScript extensively.
-   **Testing:** Test chat functionality thoroughly after each major step.
-   **Documentation:** Refer to AI SDK 5 Alpha documentation continuously.
-   **Breaking Changes:** Expect significant breaking changes from V3/V4. Direct backward compatibility is unlikely.

## Next Steps in Detailed Analysis (Beyond this initial summary)

-   Full implementation details for `convertLegacyMessageToUIMessage`.
-   Detailed review of agentic features (`loadAgent`, `toolsToUse` in `app/api/chat/route.ts`) against new AI SDK 5 agentic controls (`prepareStep`, `continueUntil`).
-   Identification and analysis of any other direct AI SDK usage points in the codebase.
