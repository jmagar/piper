/**
 * @file Manages token counting, budget calculation, and content truncation for LLM interactions.
 * 
 * CRITICAL DEPENDENCY: This module relies heavily on the `tiktoken` library (specifically 'cl100k_base' encoding)
 * for accurate token counting. `tiktoken` uses WebAssembly (WASM) and requires its WASM payload
 * to be correctly loaded in the environment.
 * 
 * If `tiktoken` fails to initialize (e.g., WASM loading issues, restrictive environments):
 *   - The system will log an error during initialization.
 *   - All token counting functions will fall back to a less accurate character-based approximation.
 *   - This fallback can significantly impact:
 *     - Message pruning accuracy (potentially pruning too much or too little).
 *     - Token budget calculations (leading to underutilization or exceeding model context limits).
 *     - Tool definition and output truncation.
 *   - It is crucial to ensure the environment supports and correctly loads `tiktoken` for optimal performance
 *     and to avoid unexpected behavior related to context limits.
 */
import { get_encoding, Tiktoken } from 'tiktoken';
import { JSONSchema7 } from 'json-schema';
import { Message as MessageAISDK, ToolSet } from 'ai';
import { appLogger } from '@/lib/logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration for token management, including limits and approximations.
 */
export const TOKEN_CONFIG = {
  // Token Management
  MAX_TOOL_OUTPUT_TOKENS: parseInt(process.env.MAX_TOOL_OUTPUT_TOKENS || "750", 10),
  MAX_TOKENS_PER_TOOL_DEFINITION: parseInt(process.env.MAX_TOKENS_PER_TOOL_DEFINITION || "150", 10), // Max tokens for a single tool's JSON definition. Applied *after* tool selection to ensure individual tool definitions sent to the LLM are not excessively verbose, balancing detail with token economy.
  MODEL_CONTEXT_LIMIT: parseInt(process.env.MODEL_CONTEXT_LIMIT || "8192", 10), // The absolute maximum context window (input + output) for the target AI model. Used for calculating the overall token budget for pruning.
  RESPONSE_RESERVATION_TOKENS: parseInt(process.env.RESPONSE_RESERVATION_TOKENS || "1500", 10),
  MINIMUM_MESSAGE_TOKEN_ALLOWANCE: parseInt(process.env.MINIMUM_MESSAGE_TOKEN_ALLOWANCE || "500", 10),
  
  // Token Estimation
  APPROX_CHARS_PER_TOKEN: 3,
  BASE_MESSAGE_TOKENS: 4, // Base tokens for message structure (role, etc.)
  
  // AI SDK Configuration
  MAX_TOKENS: 8096, // Matches Vercel AI SDK useEdgeRuntime default. This value is often slightly less than MODEL_CONTEXT_LIMIT to provide a buffer. It's used by the AI SDK for its internal calculations and might influence how it handles overall request size, distinct from the pruning budget calculated by `calculateTokenBudget` which uses MODEL_CONTEXT_LIMIT. Typically used to configure the Vercel AI SDK's `maxTokens` parameter, defining the maximum number of tokens the LLM should *generate in its response*.
  MAX_STEPS: 10,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export type TokenBudget = {
  modelLimit: number;
  toolTokens: number;
  responseReservation: number;
  messageLimit: number;
};

// =============================================================================
// ENCODER MANAGEMENT
// =============================================================================

let enc: Tiktoken | null = null;

/**
 * Initialize tiktoken encoder with error handling
 */
function initializeEncoder(): Tiktoken | null {
  if (enc) return enc;
  
  try {
    enc = get_encoding("cl100k_base");
    return enc;
  } catch (e) {
    appLogger.error(
      "[TokenUtils] CRITICAL: Failed to initialize tiktoken encoder. System will fall back to less accurate character-based token counting. This may impact context window management, pruning, and overall LLM interaction quality. Please check WASM loading and environment compatibility.",
      { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined }
    );
    return null;
  }
}

// =============================================================================
// TOKEN COUNTING
// =============================================================================

/**
 * Count tokens for a message with fallback estimation
 */
export function countTokens(message: MessageAISDK | { role: string; content: string }): number {
  const encoder = initializeEncoder();
  
  if (!encoder) {
    appLogger.warn("[countTokens] Tiktoken encoder not initialized. Falling back to character count estimation.");
    const charCount = typeof message.content === 'string' 
      ? message.content.length 
      : JSON.stringify(message.content).length;
    return Math.ceil(charCount / TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN) + TOKEN_CONFIG.BASE_MESSAGE_TOKENS;
  }
  
  let tokenCount = TOKEN_CONFIG.BASE_MESSAGE_TOKENS;
  
  try {
    if (typeof message.content === 'string' && message.content !== null && message.content !== undefined) {
      // Ensure content is not empty and doesn't contain null bytes
      const safeContent = message.content.replace(/\0/g, '');
      if (safeContent.length > 0) {
        tokenCount += encoder.encode(safeContent).length;
      }
    } else if (Array.isArray(message.content) && message.content !== null) {
      // Handle tool calls if they are in CoreMessage format
      const safeContentString = JSON.stringify(message.content).replace(/\0/g, '');
      if (safeContentString.length > 0) {
        tokenCount += encoder.encode(safeContentString).length;
      }
    }
  } catch (error) {
    appLogger.warn("[countTokens] Error encoding message content, falling back to character estimation", {
      error: error instanceof Error ? error.message : String(error),
      messageRole: message.role,
      contentType: typeof message.content,
      contentPreview: typeof message.content === 'string' ? message.content.substring(0, 100) : 'non-string'
    });
    
    // Fallback to character count estimation
    const charCount = typeof message.content === 'string' 
      ? message.content.length 
      : JSON.stringify(message.content || '').length;
    tokenCount += Math.ceil(charCount / TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
  }
  
  return tokenCount;
}

/**
 * Count tokens for multiple messages
 */
export function countMessagesTokens(messages: MessageAISDK[]): number {
  return messages.reduce((sum, msg) => sum + countTokens(msg), 0);
}

/**
 * Estimate tokens for tool definitions
 */
export function estimateToolDefinitionTokens(tools: ToolSet): number {
  if (!tools || Object.keys(tools).length === 0) return 0;
  
  try {
    const encoder = initializeEncoder();
    if (!encoder) {
      // Fallback estimation
      appLogger.warn("[estimateToolDefinitionTokens] Tiktoken encoder not initialized. Falling back to rough estimation for tool definition tokens (MAX_TOKENS_PER_TOOL_DEFINITION: 500, // Max tokens for a single tool's JSON definition. This limit is applied *after* tool selection to ensure individual tool definitions sent to the LLM are not excessively verbose. Tuned to balance detail with token economy. inaccurate tool token budgeting.");
      return TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION * Object.keys(tools).length;
    }
    
    const toolDefinitions = Object.entries(tools).map(([name, tool]) => ({
      name,
      description: (tool as { description?: string }).description || '',
      parameters: (tool as { parameters: JSONSchema7 }).parameters,
    }));
    
    const definitionsString = JSON.stringify(toolDefinitions);
    const safeDefinitionsString = definitionsString.replace(/\0/g, '');
    const tokenCount = encoder.encode(safeDefinitionsString).length;
    
    if (typeof encoder.free === 'function') encoder.free();
    
    return tokenCount;
  } catch (e) {
    appLogger.error("[TokenUtils] Error calculating tool definition tokens", e as Error);
    return TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION * Object.keys(tools).length;
  }
}

// =============================================================================
// TOOL DEFINITION TRUNCATION
// =============================================================================

/**
 * Truncates individual tool definitions within a ToolSet if they exceed configured token limits.
 * This is applied *before* sending tools to the LLM and before final token budget calculation
 * to ensure that the LLM receives concise tool information and the budget reflects this.
 */
export function truncateToolDefinitions(tools: ToolSet): ToolSet {
  if (!tools || Object.keys(tools).length === 0) return tools;

  const newTools: ToolSet = {};
  const truncationSuffix = " [...truncated]";
  // Estimate tokens for the suffix itself to be more accurate
  const suffixTokens = countTokensForString(truncationSuffix);

  for (const toolName in tools) {
    if (Object.prototype.hasOwnProperty.call(tools, toolName)) {
      const tool = tools[toolName];
      const originalToolJson = JSON.stringify({
        name: toolName,
        description: tool.description,
        parameters: tool.parameters,
      });
      const originalTokens = countTokensForString(originalToolJson);

      if (originalTokens > TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION) {
        appLogger.debug(`[truncateToolDefinitions] Tool '${toolName}' definition (tokens: ${originalTokens}) exceeds limit (${TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION}). Attempting truncation.`, {
          toolName,
          originalTokens,
          limit: TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION
        });

        let newDescription = tool.description || "";
        // Calculate how many tokens are available for the description
        // This accounts for tokens used by name, parameters, suffix, and some buffer for JSON structure
        const nonDescriptionTokens = countTokensForString(JSON.stringify({ name: toolName, parameters: tool.parameters })) + suffixTokens + 5; // 5 as a small buffer
        const targetDescriptionTokens = TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION - nonDescriptionTokens;

        if (targetDescriptionTokens > 0 && countTokensForString(tool.description || "") > targetDescriptionTokens) {
          newDescription = truncateStringByTokens(tool.description || "", targetDescriptionTokens) + truncationSuffix;
        } else if (tool.description && countTokensForString(tool.description || "") <= targetDescriptionTokens) {
          // Description is already short enough, no truncation needed for it
          newDescription = tool.description;
        } else {
          // Description is empty or target tokens for it is zero or less, so can't truncate it meaningfully
          newDescription = (tool.description || ""); // Keep original or empty
        }
        
        const newTool = {
          ...tool,
          description: newDescription,
        };

        const newToolJson = JSON.stringify({
          name: toolName,
          description: newTool.description,
          parameters: newTool.parameters
        });
        const newTokens = countTokensForString(newToolJson);

        if (newTokens <= TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION) {
          newTools[toolName] = newTool;
          appLogger.debug(`[truncateToolDefinitions] Tool '${toolName}' description truncated. New tokens: ${newTokens}.`, {
            toolName,
            newTokens
          });
        } else {
          // If truncating description is not enough, or description was already short,
          // we pass the tool with its potentially truncated description. 
          // Log a warning if it's still too large. More aggressive truncation (e.g., parameters) is out of scope for this iteration.
          newTools[toolName] = newTool;
          appLogger.warn(`[truncateToolDefinitions] Tool '${toolName}' still exceeds token limit (${newTokens}) after description truncation. Original: ${originalTokens}. Consider simplifying parameters or reducing MAX_TOKENS_PER_TOOL_DEFINITION.`, {
              toolName,
              newTokens,
              originalTokens,
              limit: TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION,
              descriptionLength: newDescription.length
          });
        }
      } else {
        newTools[toolName] = tool; // No truncation needed
      }
    }
  }
  return newTools;
}

// =============================================================================
// TOKEN BUDGET MANAGEMENT
// =============================================================================

/**
 * Calculate token budget for the request
 */
export function calculateTokenBudget(toolDefinitionTokens: number): TokenBudget {
  const calculatedLimit = TOKEN_CONFIG.MODEL_CONTEXT_LIMIT - toolDefinitionTokens - TOKEN_CONFIG.RESPONSE_RESERVATION_TOKENS;
  const finalLimit = Math.max(calculatedLimit, TOKEN_CONFIG.MINIMUM_MESSAGE_TOKEN_ALLOWANCE);
  
  return {
    modelLimit: TOKEN_CONFIG.MODEL_CONTEXT_LIMIT,
    toolTokens: toolDefinitionTokens,
    responseReservation: TOKEN_CONFIG.RESPONSE_RESERVATION_TOKENS,
    messageLimit: finalLimit
  };
}

// =============================================================================
// CONTENT TRUNCATION
// =============================================================================

/**
 * Truncate tool output content based on token limits
 */
/**
 * Estimate tokens for a raw string (with fallback).
 * This is primarily for internal use where a simple string token count is needed,
 * not a full message structure.
 */
export function countTokensForString(text: string): number {
  const encoder = initializeEncoder();
  
  if (!encoder) {
    appLogger.warn("[countTokensForString] Tiktoken encoder not initialized. Falling back to character count estimation.");
    return Math.ceil((text || '').length / TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
  }
  
  try {
    // Ensure text is safe for encoding (remove null bytes)
    const safeText = (text || '').replace(/\0/g, '');
    const tokenCount = encoder.encode(safeText).length;
    // Note: We don't call encoder.free() here as initializeEncoder manages a singleton instance.
    return tokenCount;
  } catch (error) {
    appLogger.warn("[countTokensForString] Error encoding string, falling back to character estimation", {
      error: error instanceof Error ? error.message : String(error),
      textPreview: (text || '').substring(0, 100)
    });
    return Math.ceil((text || '').length / TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
  }
}

/**
 * Truncate a string to approximately target token count (with fallback).
 */
export function truncateStringByTokens(text: string, targetTokens: number): string {
  if (targetTokens <= 0) return "";

  const encoder = initializeEncoder();

  if (!encoder) {
    appLogger.warn("[truncateStringByTokens] Tiktoken encoder not initialized. Falling back to character-based truncation.");
    const targetChars = Math.max(0, targetTokens * TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
    return (text || '').substring(0, targetChars);
  }

  try {
    // Ensure text is safe for encoding (remove null bytes)
    const safeText = (text || '').replace(/\0/g, '');
    const encoded = encoder.encode(safeText);

    if (encoded.length <= targetTokens) {
      return text; // No truncation needed or text is already shorter
    }

    const truncatedEncoded = encoded.slice(0, targetTokens);
    // TextDecoder is a standard browser API, also available in Node.js via 'util'
    // For server-side Node.js, ensure TextDecoder is available or use Buffer.from().toString()
    const result = new TextDecoder().decode(encoder.decode(truncatedEncoded));
    // Note: We don't call encoder.free() here.
    return result;
  } catch (error) {
    appLogger.warn("[truncateStringByTokens] Error truncating string with tiktoken, falling back to character-based truncation", {
      error: error instanceof Error ? error.message : String(error),
      textPreview: (text || '').substring(0, 100)
    });
    const targetChars = Math.max(0, targetTokens * TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
    return (text || '').substring(0, targetChars);
  }
}

export function truncateToolOutput(
  content: string, 
  toolName: string, 
  correlationId: string
): string {
  const processedContentString = `Tool ${toolName} executed successfully:\n\n${content}`;
  const toolOutputTokens = countTokens({ role: 'assistant', content: processedContentString });

  if (toolOutputTokens <= TOKEN_CONFIG.MAX_TOOL_OUTPUT_TOKENS) {
    return processedContentString;
  }

  appLogger.warn(
    `[truncateToolOutput] Tool output for '${toolName}' exceeds token limit. Original tokens: ${toolOutputTokens}, Max: ${TOKEN_CONFIG.MAX_TOOL_OUTPUT_TOKENS}. Truncating.`,
    { correlationId, toolName, originalTokens: toolOutputTokens }
  );

  const encoder = initializeEncoder();
  let truncatedJsonContent = content;

  if (encoder) {
    try {
      // Ensure content is safe for encoding
      const safeContent = (content || '').replace(/\0/g, '');
      const encodedJson = encoder.encode(safeContent);
      const headerTokens = countTokens({ role: 'assistant', content: `Tool ${toolName} executed successfully:\n\n` });
      const availableTokens = TOKEN_CONFIG.MAX_TOOL_OUTPUT_TOKENS - headerTokens - 10; // -10 for truncation message

      if (encodedJson.length > availableTokens) {
        const slicedEncodedJson = encodedJson.slice(0, Math.max(0, availableTokens));
        truncatedJsonContent = new TextDecoder().decode(encoder.decode(slicedEncodedJson));
      }
    } catch (error) {
      appLogger.warn("[truncateToolOutput] Error encoding content with tiktoken, using character-based truncation", {
        toolName,
        error: error instanceof Error ? error.message : String(error)
      });
      // Fall through to character-based truncation below
    }
  } else {
    // Fallback to character-based truncation
    const headerLength = `Tool ${toolName} executed successfully:\n\n`.length;
    const truncationMessageLength = `\n\n[Output truncated due to length. Original token count: ${toolOutputTokens}. Full output logged server-side.]`.length;
    const targetChars = (TOKEN_CONFIG.MAX_TOOL_OUTPUT_TOKENS * TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN) - headerLength - truncationMessageLength;
    truncatedJsonContent = content.substring(0, Math.max(0, targetChars));
  }

  const finalContent = `Tool ${toolName} executed successfully:\n\n${truncatedJsonContent}\n\n[Output truncated due to length. Original token count: ${toolOutputTokens}. Full output logged server-side.]`;

  appLogger.info(
    `[truncateToolOutput] Tool output for '${toolName}' was truncated. New token count: ${countTokens({ role: 'assistant', content: finalContent })}`,
    { correlationId, toolName }
  );

  return finalContent;
} 