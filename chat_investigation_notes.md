# Piper Chat Message Failure Investigation

This document details the systematic investigation into the failure of chat message processing in the Piper application.

## Phase 1: Initial Code Review & Log Analysis

### File: `lib/agents/load-agent.ts`

**Core Functionality & Purpose:**
- Responsible for loading a specific agent's configuration from the database using Prisma.

**`loadAgent(agentId: string)` Function Logic:**
1.  **Database Query**: Uses `prisma.agent.findUnique({ where: { id: agentId } })` to find the agent.
2.  **Agent Not Found Check**: If `prisma.agent.findUnique` returns `null`, it explicitly `throw new Error("Agent not found")`. This is the direct source of the logged error.
3.  **Tool Loading**: If the agent is found, it processes `agent.tools` (an array of tool IDs), looking them up in `TOOL_REGISTRY` and checking `tool.isAvailable()`.
4.  **Returns**: An object with `systemPrompt`, `tools` (active and available), hardcoded `maxSteps: 5`, and `mcpConfig` from the agent record.
5.  **Error Handling**: A global `try...catch` within the function catches any error (including its own "Agent not found" or errors from Prisma/tool loading) and re-throws `new Error("Agent not found")`. This means any failure within this function results in the same generic "Agent not found" error propagating upwards.

**Observations & Hypotheses for "Agent not found" Error:**
- **Primary Cause**: The `agentId` provided (e.g., "fallback-agent-id" from UI debug info, or any other agent ID from the request) does not exist as a unique `id` in the `Agent` table in the database.
- **Database Issues**: Less likely, but problems with Prisma client or DB connectivity could also lead to the catch block being executed, resulting in the masked "Agent not found" error.
- **Case Sensitivity/Data Integrity**: Mismatches in `agentId` casing or missing/corrupted agent records in the database are potential causes.
- If "fallback-agent-id" is intended as a default and is missing from the DB, this would explain the error when no other agent is explicitly chosen or loadable.

### File: `app/api/chat/lib/chat-orchestration.ts`

**Core Functionality & Purpose:**
- Orchestrates the entire chat processing pipeline after initial request validation in `route.ts`.
- Responsible for loading agent configurations, configuring tools, processing message mentions, managing token budgets, and preparing the final data payload for the LLM (`streamText` function).

**Key Steps in `orchestrateChatProcessing`:**
1.  **Load Agent Configuration (`loadAgentConfiguration`)**: Calls `loadAgent(agentId)` from `lib/agents/load-agent.ts`. This is where an "Agent not found" error would originate if `loadAgent` throws.
2.  **Determine Effective Model & System Prompt**: Uses request values, agent config, or defaults.
3.  **Configure Tools (`configureTools`)**: Gathers tools from `toolCollectionManager` and filters them based on agent config (if any).
4.  **Process Message Mentions**: Handles `@file/`, `@prompt/`, `@tool/`, `@url/` mentions in messages.
5.  **Select Relevant Tools**: Filters `availableTools` based on message content.
6.  **Token Management & Tool Optimization**: Estimates tool token costs, calculates overall budget, optimizes/truncates tool definitions.
    - Line 130 (in provided code): `const toolDefinitionTokens = availableTools ? estimateToolDefinitionTokens(availableTools) : 0;`
    - The `TypeError: Cannot read properties of undefined (reading 'error')` is reported at this line (or within `estimateToolDefinitionTokens`).
7.  **Prune Messages**: Ensures messages fit the token budget.
8.  Returns `ProcessedChatData`.

**Error Handling:**
- The main function `orchestrateChatProcessing` has a `try...catch` block.
- If `loadAgent` throws "Agent not found", this `catch` block logs it as "Error in chat processing pipeline" and re-throws the original error.

**Observations & Hypotheses based on Logs & Code:**
1.  **"Agent not found" Error**: This error directly comes from `lib/agents/load-agent.ts` if the `agentId` doesn't resolve. `chat-orchestration.ts` catches and re-throws it.
2.  **`TypeError` at line 130 (estimating tool tokens)**:
    - This error seems distinct from the "Agent not found" error. If an agent *is* found (or no agent is specified), processing continues until this point.
    - The error message "Cannot read properties of undefined (reading 'error')" suggests that `estimateToolDefinitionTokens` (or a function it calls) attempts to access an `.error` property on an `undefined` object.
    - **Strong Link to MCP Config Issues (Memories `54f10469...` & `e6c70881...`)**: The `config.json` for MCP servers is in a legacy format, and the normalization logic (`mcpManager.ts`) was deleted. `toolCollectionManager` (used by `configureTools`) likely fails to parse this legacy config correctly, leading to malformed `availableTools` data.
    - If `estimateToolDefinitionTokens` receives these malformed tools, it could easily encounter an undefined object when expecting a certain structure, causing the `TypeError`.

**Summary of Potential Failure Points:**
- **Primary**: `lib/agents/load-agent.ts` failing to find/load an agent, causing the "Agent not found" error.
- **Secondary**: Malformed tool data due to MCP configuration issues (legacy `config.json`, no normalization) leading to a `TypeError` in `estimateToolDefinitionTokens` within `chat-orchestration.ts`, even if an agent is loaded or not specified.

### File: `app/api/chat/route.ts`

**Core Functionality & Purpose:**
- Defines the main API endpoint (`POST /api/chat`) for handling chat message requests.
- Responsible for receiving user messages, orchestrating chat processing (including agent loading, tool preparation, LLM interaction), and streaming back the assistant's response.

**Request Handling & Validation:**
- Expects a POST request with a JSON body.
- Uses Zod (`ChatRequestSchema`) for validation. Schema expects `messages`, `chatId`, `agentId`, `userId`, and optional `model`, `systemPrompt`, `operationId`.
- The `agentId` is passed directly to `orchestrateChatProcessing`.

**Key Data Structures & Types:**
- `messageSchema` (Zod): For individual messages.
- `PiperMessage` (TypeScript): Inferred from `messageSchema`.
- `ChatRequestSchema` (Zod): For the overall request body.
- `CoreMessage` (Vercel AI SDK): Used for `streamText`.
- `transformPiperMessagesToCoreMessages`: Converts `PiperMessage` to `CoreMessage`.

**Workflow & Orchestration:**
1.  Validates request.
2.  Logs user message (`logUserMessage`).
3.  Calls `orchestrateChatProcessing` (from `./lib/chat-orchestration.ts`) with request parameters. This is a critical handoff.
4.  Initializes OpenRouter client.
5.  Calls `streamText` with data from `orchestrateChatProcessing` (model, messages, system prompt, tools).
6.  `onFinish` callback saves assistant message and tracks usage.
7.  Returns a data stream to the client.

**Error Handling:**
- Top-level `try...catch` logs errors via `appLogger` and returns a 500 JSON response.

**Observations based on Logs & Code:**
- The `agentId` (e.g., "fallback-agent-id") is passed from the request to `orchestrateChatProcessing`.
- The "Agent not found" error likely stems from this `agentId` not resolving to a valid agent within `orchestrateChatProcessing` or its subsequent calls (`loadAgentConfiguration` -> `loadAgent`).
- The `TypeError: Cannot read properties of undefined (reading 'error')` in `chat-orchestration.ts` (line 130) suggests improper error handling after the agent loading fails.

