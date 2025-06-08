# Piper Chat Enhancements: Improving Stability and User Experience

This document outlines a series of recommended enhancements to the Piper chat system, focusing on improving stability during LLM interactions, especially when tools are involved, and enhancing user feedback.

## 1. Implement Adaptive Message Pruning (Server-Side)

**Benefit**: Provides a more accurate way to manage payload size while retaining as much relevant context as possible, reducing LLM errors due to context loss.

**File to Modify**: `app/api/chat/route.ts`
**Function to Modify**: `pruneMessagesForPayloadSize`

**Detailed Steps**:

1.  **Install a Tokenizer Library**:
    *   Choose a library suitable for counting tokens for your target LLM (e.g., `gpt-tokenizer` for OpenAI models, or a more general BPE tokenizer).
    *   Add it to your project's dependencies:
        ```bash
        npm install gpt-tokenizer
        # or
        yarn add gpt-tokenizer
        ```

2.  **Import the Tokenizer**:
    ```typescript
    // At the top of app/api/chat/route.ts
    import { encode } from 'gpt-tokenizer'; // Or your chosen library
    ```

3.  **Define Token Limits**:
    *   Establish a target maximum token limit for the message payload sent to the LLM. This might be slightly less than the model's absolute maximum to leave room for the LLM's response generation.
    *   Consider making this configurable (see Recommendation #5). For now, you can define it as a constant.
    *   Example: `const TARGET_PAYLOAD_TOKEN_LIMIT = 3000;` (Adjust based on the primary model used, e.g., 4K, 8K, 16K models).

4.  **Modify `pruneMessagesForPayloadSize` Logic**:
    *   The function currently uses fixed message counts (12 with tools, 20 without). Replace this with token-based logic.
    *   **Core Idea**: Iterate through messages (likely in reverse, starting from the most recent), counting tokens for each, until the `TARGET_PAYLOAD_TOKEN_LIMIT` is approached. Always include system messages.

    *   **Algorithm Sketch**:
        ```typescript
        function countTokens(message: { role: string; content: string }): number {
          // Simple example; adjust for message structure (role, name, content, tool_calls)
          // Tool calls also consume tokens.
          let tokens = encode(message.content || "").length;
          if (message.role === "assistant" && message.tool_calls) {
            tokens += encode(JSON.stringify(message.tool_calls)).length; // Rough estimate
          }
          // Add tokens for role, etc. (OpenAI specific, usually small, ~4 tokens per message)
          tokens += 4; 
          return tokens;
        }

        export function pruneMessagesForPayloadSize(
          messages: Message[], 
          // remove fixedCount and usesTools parameters if no longer directly needed
        ): Message[] {
          const systemMessages = messages.filter(msg => msg.role === 'system');
          const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
          
          let currentTokenCount = systemMessages.reduce((sum, msg) => sum + countTokens(msg), 0);
          const prunedMessages: Message[] = [];

          // Iterate from most recent non-system messages
          for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
            const message = nonSystemMessages[i];
            const messageTokens = countTokens(message);

            if (currentTokenCount + messageTokens <= TARGET_PAYLOAD_TOKEN_LIMIT) {
              prunedMessages.unshift(message); // Add to the beginning to maintain order
              currentTokenCount += messageTokens;
            } else {
              // Log that pruning is stopping due to token limit
              appLogger.info(`[pruneMessages] Token limit reached. Pruned ${i + 1} older non-system messages. Current tokens: ${currentTokenCount}`);
              break; 
            }
          }
          
          // Combine system messages (always included) with the pruned non-system messages
          const finalMessages = [...systemMessages, ...prunedMessages];
          
          // Log final count and number of messages
          appLogger.info(`[pruneMessages] Final message count: ${finalMessages.length}, Token count: ${currentTokenCount}`);
          
          return finalMessages;
        }
        ```

5.  **Testing**:
    *   Thoroughly test with various conversation lengths, including those with many tool calls and large tool outputs (once Recommendation #2 is also implemented).
    *   Verify that system messages are always preserved.
    *   Monitor logs (see Recommendation #3) to ensure token counts are accurate and pruning behaves as expected.

## 2. Truncate Large Tool Result Injections (Server-Side)

**Benefit**: Prevents single large tool outputs from overwhelming the conversation history, causing excessive pruning or payload size errors.

**File to Modify**: `app/api/chat/route.ts`
**Function to Modify**: `processToolMentions` (or wherever tool results are fetched and prepared for injection)

**Detailed Steps**:

1.  **Define Truncation Thresholds**:
    *   Establish a maximum token or character limit for individual tool outputs before they are injected.
    *   Example: `const MAX_TOOL_OUTPUT_TOKENS = 750;` (configurable, see Recommendation #5).

2.  **Modify Tool Result Injection Logic**:
    *   Inside `processToolMentions`, after a tool executes and returns its result:
        ```typescript
        // Assuming 'toolExecutionResult' is the string content from the tool
        let processedResult = toolExecutionResult.content; // Assuming content is a string

        const resultTokens = countTokens({ role: "assistant", content: processedResult }); // Use the same token counting logic

        if (resultTokens > MAX_TOOL_OUTPUT_TOKENS) {
          // Truncate the content
          // For token-based truncation, you might need to encode, slice tokens, then decode.
          // Simpler character-based truncation:
          // processedResult = toolExecutionResult.content.substring(0, CHARACTER_LIMIT_EQUIVALENT_TO_TOKENS);
          
          // For token-based (more accurate):
          const encodedResult = encode(processedResult);
          const truncatedEncodedResult = encodedResult.slice(0, MAX_TOOL_OUTPUT_TOKENS);
          processedResult = decode(truncatedEncodedResult); // decode might not be available in all libs, or use a compatible method

          processedResult += `\n\n[Output truncated due to length. Original token count: ${resultTokens}. Full output logged server-side.]`;
          
          appLogger.warn(`[processToolMentions] Tool output for '${toolCall.toolName}' was truncated. Original tokens: ${resultTokens}, Truncated tokens: MAX_TOOL_OUTPUT_TOKENS`, {
            correlationId, 
            toolName: toolCall.toolName,
            originalSize: resultTokens,
          });
        }

        // Ensure the full, untruncated toolExecutionResult.content is logged
        appLogger.info(`[processToolMentions] Full tool output for '${toolCall.toolName}'`, { 
            correlationId, 
            toolName: toolCall.toolName, 
            output: toolExecutionResult.content // Log the original full content
        });
        
        // ... then create the assistant message with 'processedResult'
        // newMessages.push({ role: 'assistant', content: processedResult, tool_call_id: toolCall.id });
        ```

3.  **Ensure Full Logging**:
    *   Crucially, always log the *complete, untruncated* tool output to the server-side logs before any truncation logic is applied. This is vital for debugging and if users need to access the full information later.

## 3. Enhance Logging for Pruning and Tool Outputs (Server-Side)

**Benefit**: Improves traceability when debugging context-related issues and understanding system behavior.

**File to Modify**: `app/api/chat/route.ts`
**Functions to Modify**: `pruneMessagesForPayloadSize`, `processToolMentions`, and other relevant areas.

**Detailed Steps**:

1.  **In `pruneMessagesForPayloadSize`**:
    *   Log the reason for pruning (e.g., "Fixed limit due to tool use" if that logic is partially kept, or "Token limit approached/exceeded").
    *   Log the number of messages before and after pruning.
    *   Log the calculated token count before and after pruning.
    *   If messages are removed, consider logging the IDs or a summary (e.g., "Removed 5 messages from index 3 to 7") of the removed messages for deeper debugging if necessary (be mindful of log verbosity).
        ```typescript
        // Example log from within pruneMessagesForPayloadSize
        appLogger.info(
          `[pruneMessages] Before pruning: ${initialMessages.length} messages, ~${initialTokenCount} tokens. Reason: ${pruningReason}.`, 
          { correlationId }
        );
        appLogger.info(
          `[pruneMessages] After pruning: ${finalMessages.length} messages, ~${finalTokenCount} tokens. Removed: ${messagesRemovedCount} messages.`,
          { correlationId }
        );
        ```

2.  **In `processToolMentions`**:
    *   Log the size (character count and token count) of each tool output *before* truncation.
    *   If truncation occurs, log that it happened, the original size, and the truncated size.
    *   As mentioned in Recommendation #2, ensure the *full, untruncated* tool output is always logged.

3.  **General Logging Practices**:
    *   Ensure all logs include a `correlationId` that ties together all operations for a single chat request.
    *   Log key decisions and state changes throughout the chat request lifecycle.

## 4. Improve Client-Side Error Feedback

**Benefit**: Better user experience by informing them about the nature of the failure, rather than just showing a generic retry button.

**File to Modify**: `app/components/chat/chat.tsx` (or wherever `useChat` is primarily used and its state is managed).

**Detailed Steps**:

1.  **Monitor `useChat().error`**:
    *   The `useChat` hook (from Vercel AI SDK) provides an `error` object in its return value. This object usually contains details about the error if the API call fails.

2.  **Display Toast Notification on Error**:
    *   Use a `useEffect` hook in `chat.tsx` to watch for changes in the `error` object from `useChat`.
    *   If `error` is not null, display a toast notification (e.g., using `sonner`) with the error message.

    ```typescript
    // In app/components/chat/chat.tsx

    import { useChat } from "ai/react"; // Or your specific import
    import { useEffect } from "react";
    import { toast } from "@/components/ui/toast"; // Or your toast import

    // ... inside the Chat component ...
    const { messages, input, handleInputChange, handleSubmit, isLoading, error, stop, reload, setMessages, status } = useChat({
      // ... your useChat config ...
      api: API_ROUTE_CHAT,
      // ...
    });

    useEffect(() => {
      if (error) {
        // Attempt to get a meaningful message
        const errorMessage = error.message || "An unexpected error occurred while sending your message. Please try again.";
        
        toast({
          title: "Chat Error",
          description: errorMessage,
          status: "error", // Or 'destructive' depending on your toast component
          duration: 5000, // Optional: how long the toast stays
        });
        // Optionally, you might want to clear the error from useChat's state if it has such a mechanism,
        // or it might clear automatically on the next successful operation.
      }
    }, [error]); // Dependency array ensures this runs when 'error' object changes

    // ... rest of your component ...
    ```

3.  **Ensure `chat-input.tsx` Still Shows Retry**:
    *   The existing logic in `chat-input.tsx` that shows a "Retry" button when `status === "error"` should remain. The toast provides additional detail, while the button provides the action.

## 5. Configuration for Thresholds (Server-Side)

**Benefit**: Allows for easier tuning and adaptation of pruning and truncation behavior without requiring code changes and redeployments.

**File to Modify**: `app/api/chat/route.ts` and environment variable handling (e.g., `.env` files, deployment environment settings).

**Detailed Steps**:

1.  **Define Environment Variables**:
    *   In your `.env` or `.env.local` file (and corresponding production environment settings), define variables for the thresholds:
        ```env
        # Example .env.local
        NEXT_PUBLIC_PRUNING_TARGET_TOKEN_LIMIT=3000
        NEXT_PUBLIC_MAX_TOOL_OUTPUT_TOKENS=750
        ```
        *(Note: `NEXT_PUBLIC_` prefix is for client-side accessible env vars. For server-side only, you can omit it, but accessing them in Next.js API routes might differ slightly based on your setup. Usually, `process.env.VAR_NAME` works directly in API routes.)*

2.  **Access Environment Variables in Code**:
    *   In `app/api/chat/route.ts`, read these values from `process.env`. Provide sensible defaults if the environment variables are not set.

    ```typescript
    // At the top of app/api/chat/route.ts or in a config module

    const TARGET_PAYLOAD_TOKEN_LIMIT = parseInt(process.env.PRUNING_TARGET_TOKEN_LIMIT || "3000", 10);
    const MAX_TOOL_OUTPUT_TOKENS = parseInt(process.env.MAX_TOOL_OUTPUT_TOKENS || "750", 10);

    // Then use these constants in pruneMessagesForPayloadSize and processToolMentions
    ```

3.  **Documentation**:
    *   Document these new environment variables in your project's main README or deployment guides so that operators know they can be configured.

By implementing these enhancements, the Piper chat system should become more resilient to issues caused by large message payloads and tool outputs, and provide better feedback to users when errors do occur.