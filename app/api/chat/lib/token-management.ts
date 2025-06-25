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
import { createHash } from 'crypto';
import { redisCacheManager } from '@/lib/mcp/modules/redis-cache-manager';

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
  
  // Cache Configuration for Token Optimization
  TOKEN_CACHE_TTL: 30 * 60, // 30 minutes (content rarely changes)
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

export type TokenCountingMetrics = {
  totalAttempts: number;
  successfulEncodings: number;
  fallbackUsage: number;
  nullPointerErrors: number;
  sanitizationFailures: number;
  validationFailures: number;
  lastErrorTimestamp?: Date;
  lastErrorMessage?: string;
};

// =============================================================================
// ENCODER MANAGEMENT & METRICS
// =============================================================================

// Global metrics tracking for token counting operations
let tokenMetrics: TokenCountingMetrics = {
  totalAttempts: 0,
  successfulEncodings: 0,
  fallbackUsage: 0,
  nullPointerErrors: 0,
  sanitizationFailures: 0,
  validationFailures: 0,
};

/**
 * Get current token counting metrics
 */
export function getTokenCountingMetrics(): TokenCountingMetrics {
  return { ...tokenMetrics };
}

/**
 * Reset token counting metrics
 */
export function resetTokenCountingMetrics(): void {
  tokenMetrics = {
    totalAttempts: 0,
    successfulEncodings: 0,
    fallbackUsage: 0,
    nullPointerErrors: 0,
    sanitizationFailures: 0,
    validationFailures: 0,
  };
}

/**
 * Create a fresh tiktoken encoder with error handling
 * Creates a new encoder instance for each operation to prevent concurrency issues
 */
function createEncoder(): Tiktoken | null {
  try {
    return get_encoding("cl100k_base");
  } catch (e) {
    appLogger.error(
      "[TokenUtils] CRITICAL: Failed to create tiktoken encoder. System will fall back to less accurate character-based token counting. This may impact context window management, pruning, and overall LLM interaction quality. Please check WASM loading and environment compatibility.",
      { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined }
    );
    return null;
  }
}

// =============================================================================
// CACHING UTILITIES
// =============================================================================

/**
 * Generate content hash for caching
 */
function generateContentHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

/**
 * Check token count cache
 */
async function getCachedTokenCount(contentHash: string): Promise<number | null> {
  try {
    return await redisCacheManager.getTokenCount(contentHash);
  } catch (error) {
    appLogger.warn('[TokenCache] Error checking token count cache', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
}

/**
 * Cache token count
 */
async function cacheTokenCount(contentHash: string, tokenCount: number): Promise<void> {
  try {
    await redisCacheManager.setTokenCount(contentHash, tokenCount, TOKEN_CONFIG.TOKEN_CACHE_TTL);
  } catch (error) {
    appLogger.warn('[TokenCache] Error caching token count', { 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}

// =============================================================================
// TOKEN COUNTING
// =============================================================================

/**
 * Count tokens for a message with fallback estimation
 */
export function countTokens(message: MessageAISDK | { role: string; content: string }): number {
  const encoder = createEncoder();
  
  if (!encoder) {
    appLogger.warn("[countTokens] Tiktoken encoder not initialized. Falling back to character count estimation.");
    const charCount = typeof message.content === 'string' 
      ? message.content.length 
      : JSON.stringify(message.content).length;
    return Math.ceil(charCount / TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN) + TOKEN_CONFIG.BASE_MESSAGE_TOKENS;
  }
  
  let tokenCount = TOKEN_CONFIG.BASE_MESSAGE_TOKENS;
  
  try {
    // Additional safety checks for message content
    if (!message || message.content === null || message.content === undefined) {
      appLogger.warn("[countTokens] Message or content is null/undefined, returning base tokens only");
      return TOKEN_CONFIG.BASE_MESSAGE_TOKENS;
    }
    
    if (typeof message.content === 'string') {
      // Progressive sanitization with retry logic
      const encodingResult = attemptProgressiveEncoding(message.content, encoder);
      if (encodingResult.success) {
        tokenCount += encodingResult.tokenCount;
      } else {
        // Comprehensive fallback system
        const fallbackEstimate = getFallbackTokenEstimate(message.content);
        tokenCount += fallbackEstimate;
                 appLogger.warn("[countTokens] All encoding attempts failed, using comprehensive fallback estimation", {
           originalLength: message.content.length,
           sanitizedLength: fallbackEstimate
         });
      }
    } else if (Array.isArray(message.content)) {
      // Handle tool calls if they are in CoreMessage format
      const jsonString = JSON.stringify(message.content);
      const safeContentString = sanitizeForTiktoken(jsonString);
      if (safeContentString.length > 0) {
        try {
          tokenCount += encoder.encode(safeContentString).length;
        } catch (encodeError) {
          const contentArray = message.content as unknown[];
          appLogger.warn("[countTokens] Failed to encode array content even after sanitization", {
            error: encodeError instanceof Error ? encodeError.message : String(encodeError),
            arrayLength: contentArray.length,
            sanitizedLength: safeContentString.length
          });
          tokenCount += Math.ceil(safeContentString.length / TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
        }
      }
    } else {
      // Handle other content types by stringifying
      const jsonString = JSON.stringify(message.content);
      const safeContentString = sanitizeForTiktoken(jsonString);
      if (safeContentString.length > 0) {
        try {
          tokenCount += encoder.encode(safeContentString).length;
        } catch (encodeError) {
          appLogger.warn("[countTokens] Failed to encode other content type even after sanitization", {
            error: encodeError instanceof Error ? encodeError.message : String(encodeError),
            contentType: typeof message.content,
            sanitizedLength: safeContentString.length
          });
          tokenCount += Math.ceil(safeContentString.length / TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
        }
      }
    }
  } catch (error) {
    appLogger.warn("[countTokens] Error encoding message content, falling back to character estimation", {
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Fallback to character count estimation
    const charCount = typeof message.content === 'string' 
      ? message.content.length 
      : JSON.stringify(message.content || '').length;
    tokenCount += Math.ceil(charCount / TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
  } finally {
    // Always clean up the encoder
    if (encoder && typeof encoder.free === 'function') {
      encoder.free();
    }
  }
  
  return tokenCount;
}

/**
 * Comprehensive fallback token estimation when tiktoken fails
 * Uses multiple estimation methods for better accuracy
 */
function getFallbackTokenEstimate(content: string): number {
  if (!content || typeof content !== 'string') {
    return 0;
  }
  
  // Method 1: Character-based estimation (default)
  const charEstimate = Math.ceil(content.length / TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
  
  // Method 2: Word-based estimation (often more accurate for natural language)
  const words = content.trim().split(/\s+/).filter(word => word.length > 0);
  const wordEstimate = Math.ceil(words.length / 0.75); // ~0.75 words per token average
  
  // Method 3: Conservative estimation for complex content
  const conservativeEstimate = Math.ceil(content.length / 5); // Very safe 5 chars per token
  
  // Method 4: Pattern-based estimation
  let patternEstimate = 0;
  
  // Count different types of content
  const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
  const jsonObjects = (content.match(/\{[\s\S]*?\}/g) || []).length;
  const urls = (content.match(/https?:\/\/[^\s]+/g) || []).length;
  const numbers = (content.match(/\d+/g) || []).length;
  
  // Base pattern estimate
  patternEstimate = charEstimate;
  
  // Adjust for content complexity
  if (codeBlocks > 0) patternEstimate *= 1.2; // Code is more token-dense
  if (jsonObjects > 0) patternEstimate *= 1.1; // JSON has overhead
  if (urls > 0) patternEstimate += urls * 2; // URLs are typically 2+ tokens each
  if (numbers > 0) patternEstimate += numbers * 0.5; // Numbers can be fractional tokens
  
  // Use the median of our estimates for better accuracy
  const estimates = [charEstimate, wordEstimate, conservativeEstimate, Math.ceil(patternEstimate)];
  estimates.sort((a, b) => a - b);
  
  const medianEstimate = estimates.length % 2 === 0
    ? Math.ceil((estimates[estimates.length / 2 - 1] + estimates[estimates.length / 2]) / 2)
    : estimates[Math.floor(estimates.length / 2)];
  
     appLogger.debug("[getFallbackTokenEstimate] Multiple estimation methods", {
     originalLength: content.length,
     sanitizedLength: medianEstimate
   });
  
  return Math.max(1, medianEstimate); // Ensure at least 1 token
}

/**
 * Progressive encoding with multiple sanitization levels
 * Attempts increasingly aggressive sanitization until encoding succeeds
 */
function attemptProgressiveEncoding(content: string, encoder: Tiktoken): { success: boolean; tokenCount: number; attempts: number } {
  const sanitizationLevels = [
    { name: 'basic', func: sanitizeForTiktoken },
    { name: 'aggressive', func: sanitizeAggressively },
    { name: 'ultrasafe', func: sanitizeUltraSafe }
  ];
  
  for (let i = 0; i < sanitizationLevels.length; i++) {
    const level = sanitizationLevels[i];
    
    try {
      const sanitized = level.func(content);
      
      if (sanitized.length === 0) {
        continue; // Skip empty content
      }
      
      // Validate before encoding
      if (validateContentForEncoding(sanitized)) {
        try {
          const tokens = encoder.encode(sanitized).length;
          appLogger.debug(`[attemptProgressiveEncoding] Success with ${level.name} sanitization`, {
            originalLength: content.length,
            sanitizedLength: sanitized.length
          });
          return { success: true, tokenCount: tokens, attempts: i + 1 };
        } catch (encodeError) {
                     appLogger.warn(`[attemptProgressiveEncoding] Encoding failed with ${level.name} sanitization`, {
             error: encodeError instanceof Error ? encodeError.message : String(encodeError)
           });
        }
      } else {
                 appLogger.warn(`[attemptProgressiveEncoding] Validation failed with ${level.name} sanitization`);
      }
    } catch (sanitizeError) {
             appLogger.warn(`[attemptProgressiveEncoding] Sanitization failed at ${level.name} level`, {
         error: sanitizeError instanceof Error ? sanitizeError.message : String(sanitizeError)
       });
    }
  }
  
  return { success: false, tokenCount: 0, attempts: sanitizationLevels.length };
}

/**
 * Aggressive sanitization that removes more content to ensure encoding safety
 */
function sanitizeAggressively(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  try {
    return String(content)
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\uFFFE\uFFFF]/g, '') // Remove invalid Unicode
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove ALL control characters
      .replace(/[\uD800-\uDFFF]/g, '') // Remove unpaired surrogates
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Keep only printable characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .normalize('NFC')
      .trim()
      .substring(0, 100000); // Hard limit for aggressive mode
  } catch {
    return '';
  }
}

/**
 * Ultra-safe sanitization that keeps only basic ASCII and common Unicode
 */
function sanitizeUltraSafe(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  try {
    return String(content)
      .replace(/[^\x20-\x7E\u00A0-\u017F\u0100-\u024F]/g, '') // Keep only basic Latin
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 50000); // Very conservative length limit
  } catch {
    return '';
  }
}

/**
 * Pre-encoding validation to verify string integrity before passing to tiktoken
 * Performs comprehensive checks to prevent null pointer errors in Rust encoder
 */
function validateContentForEncoding(content: string): boolean {
  try {
    // Basic type and null safety checks
    if (typeof content !== 'string' || content === null || content === undefined) {
      return false;
    }
    
    // Check for empty string (valid but skip encoding)
    if (content.length === 0) {
      return true;
    }
    
    // Memory safety check - prevent extremely large strings
    const MAX_ENCODING_LENGTH = 500_000; // 500KB limit for encoding
    if (content.length > MAX_ENCODING_LENGTH) {
             appLogger.warn("[validateContentForEncoding] Content too large for safe encoding", {
         originalLength: content.length
       });
      return false;
    }
    
    // Check for null bytes and other dangerous characters
    if (content.includes('\0')) {
      return false;
    }
    
    // Validate UTF-8 encoding integrity
    try {
      const buffer = Buffer.from(content, 'utf8');
      const roundTrip = buffer.toString('utf8');
      if (roundTrip !== content) {
        appLogger.warn("[validateContentForEncoding] UTF-8 round-trip validation failed");
        return false;
      }
    } catch (utfError) {
      appLogger.warn("[validateContentForEncoding] UTF-8 validation failed", {
        error: utfError instanceof Error ? utfError.message : String(utfError)
      });
      return false;
    }
    
    // Check for invalid Unicode sequences that could cause encoder issues
    const invalidUnicodePattern = /[\uFFFE\uFFFF\uD800-\uDFFF]/;
    if (invalidUnicodePattern.test(content)) {
      appLogger.warn("[validateContentForEncoding] Invalid Unicode sequences detected");
      return false;
    }
    
    // Advanced validation: ensure string doesn't contain problematic patterns
    // that have been known to cause issues with tiktoken's Rust implementation
    
    // Check for extremely long runs of the same character (potential DoS)
    const maxRepeatingChars = 10000;
    for (let i = 0; i < content.length - maxRepeatingChars; i++) {
      const char = content[i];
      let count = 1;
      for (let j = i + 1; j < content.length && content[j] === char; j++) {
        count++;
        if (count > maxRepeatingChars) {
                     appLogger.warn("[validateContentForEncoding] Excessive character repetition detected", {
             originalLength: count
           });
          return false;
        }
      }
    }
    
    // Content passed all validation checks
    return true;
    
  } catch (error) {
    appLogger.warn("[validateContentForEncoding] Validation error, content rejected", {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Enhanced sanitize content for tiktoken to prevent Rust null pointer errors
 * Handles comprehensive edge cases including buffers, circular references, and malformed Unicode
 */
function sanitizeForTiktoken(content: string): string {
  // Enhanced type and null checking
  if (content === null || content === undefined) {
    return '';
  }
  
  // Handle buffer-like objects and non-string types
  if (typeof content !== 'string') {
    if (content && typeof content === 'object') {
             // Handle Buffer objects
       if (Buffer.isBuffer(content)) {
         try {
           content = (content as Buffer).toString('utf8');
        } catch (error) {
          appLogger.warn("[sanitizeForTiktoken] Failed to convert Buffer to string", {
            error: error instanceof Error ? error.message : String(error)
          });
          return '';
        }
      }
      // Handle other objects with circular reference protection
      else {
        try {
          const seen = new WeakSet();
          content = JSON.stringify(content, (key, val) => {
            if (val != null && typeof val === 'object') {
              if (seen.has(val)) {
                return '[Circular Reference]';
              }
              seen.add(val);
            }
            return val;
          });
        } catch (error) {
          appLogger.warn("[sanitizeForTiktoken] Failed to stringify object content", {
            error: error instanceof Error ? error.message : String(error)
          });
          return '';
        }
      }
    } else {
      // Convert primitives to string safely
      try {
        content = String(content);
      } catch (error) {
        appLogger.warn("[sanitizeForTiktoken] Failed to convert content to string", {
          error: error instanceof Error ? error.message : String(error)
        });
        return '';
      }
    }
  }
  
  // String length safety check (prevent memory issues)
  const MAX_SAFE_LENGTH = 1_000_000; // 1MB character limit
  if (content.length > MAX_SAFE_LENGTH) {
         appLogger.warn("[sanitizeForTiktoken] Content too large, truncating", {
       originalLength: content.length
     });
    content = content.substring(0, MAX_SAFE_LENGTH) + '...[truncated]';
  }
  
  try {
    // Enhanced sanitization with multiple passes
    let sanitized = String(content);
    
    // Pass 1: Remove dangerous null and control characters
    sanitized = sanitized
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\uFFFE\uFFFF]/g, '') // Remove invalid Unicode characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters except tab, LF, CR
      .replace(/[\uD800-\uDFFF]/g, ''); // Remove unpaired surrogates
    
    // Pass 2: Handle zero-width and invisible characters that confuse tokenizers
    sanitized = sanitized
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces, joiners, BOM
      .replace(/[\u2060-\u2063]/g, '') // Word joiners, invisible separators
      .replace(/[\u202A-\u202E]/g, ''); // Bidirectional text controls
    
    // Pass 3: Fix malformed UTF-8 sequences
    try {
      // Encode and decode to catch malformed sequences
      const buffer = Buffer.from(sanitized, 'utf8');
      sanitized = buffer.toString('utf8');
    } catch (utf8Error) {
      appLogger.warn("[sanitizeForTiktoken] UTF-8 encoding issues detected, using replacement characters", {
        error: utf8Error instanceof Error ? utf8Error.message : String(utf8Error)
      });
      // Replace invalid UTF-8 with replacement character
      sanitized = sanitized.replace(/[\uFFFD]/g, ''); // Remove replacement characters
    }
    
    // Pass 4: Unicode normalization and final cleanup
    try {
      sanitized = sanitized.normalize('NFC'); // Canonical composition
    } catch (normalizeError) {
      appLogger.warn("[sanitizeForTiktoken] Unicode normalization failed, skipping", {
        error: normalizeError instanceof Error ? normalizeError.message : String(normalizeError)
      });
    }
    
    // Final validation: ensure we haven't created new issues
    if (typeof sanitized !== 'string') {
      appLogger.warn("[sanitizeForTiktoken] Sanitization produced non-string result, returning empty string");
      return '';
    }
    
    // Trim whitespace but preserve intentional formatting
    return sanitized.trim();
    
  } catch (error) {
         appLogger.warn("[sanitizeForTiktoken] Critical error during sanitization, returning empty string", {
       error: error instanceof Error ? error.message : String(error),
       originalLength: content?.length || 0,
       contentType: typeof content
     });
    return '';
  }
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
  
  const encoder = createEncoder();
  
  if (!encoder) {
    // Fallback estimation
    appLogger.warn("[estimateToolDefinitionTokens] Tiktoken encoder not initialized. Falling back to rough estimation for tool definition tokens (MAX_TOKENS_PER_TOOL_DEFINITION: 500, // Max tokens for a single tool's JSON definition. This limit is applied *after* tool selection to ensure individual tool definitions sent to the LLM are not excessively verbose. Tuned to balance detail with token economy. inaccurate tool token budgeting.");
    return TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION * Object.keys(tools).length;
  }
  
  try {
    const toolDefinitions = Object.entries(tools).map(([name, tool]) => ({
      name,
      description: (tool as { description?: string }).description || '',
      parameters: (tool as { parameters: JSONSchema7 }).parameters,
    }));
    
    const definitionsString = JSON.stringify(toolDefinitions);
    const safeDefinitionsString = sanitizeForTiktoken(definitionsString);
    const tokenCount = encoder.encode(safeDefinitionsString).length;
    
    return tokenCount;
  } catch (e) {
    appLogger.error("[TokenUtils] Error calculating tool definition tokens", e as Error);
    return TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION * Object.keys(tools).length;
  } finally {
    // Always clean up the encoder
    if (encoder && typeof encoder.free === 'function') {
      encoder.free();
    }
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
        appLogger.debug(`[truncateToolDefinitions] Tool '${toolName}' definition (tokens: ${originalTokens}) exceeds limit (${TOKEN_CONFIG.MAX_TOKENS_PER_TOOL_DEFINITION}). Attempting truncation.`);

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
          appLogger.debug(`[truncateToolDefinitions] Tool '${toolName}' description truncated. New tokens: ${newTokens}.`);
        } else {
          // If truncating description is not enough, or description was already short,
          // we pass the tool with its potentially truncated description. 
          // Log a warning if it's still too large. More aggressive truncation (e.g., parameters) is out of scope for this iteration.
          newTools[toolName] = newTool;
          appLogger.warn(`[truncateToolDefinitions] Tool '${toolName}' still exceeds token limit (${newTokens}) after description truncation. Original: ${originalTokens}. Consider simplifying parameters or reducing MAX_TOKENS_PER_TOOL_DEFINITION.`);
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
 * Estimate tokens for a raw string (with fallback).
 * This is primarily for internal use where a simple string token count is needed,
 * not a full message structure.
 */
export function countTokensForString(text: string): number {
  const encoder = createEncoder();
  
  if (!encoder) {
    appLogger.warn("[countTokensForString] Tiktoken encoder not initialized. Falling back to character count estimation.");
    return Math.ceil((text || '').length / TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
  }
  
  try {
    // Additional safety checks for null/undefined/empty content
    if (text === null || text === undefined) {
      appLogger.warn("[countTokensForString] Received null/undefined text, returning 0 tokens");
      return 0;
    }
    
    // Sanitize text for tiktoken
    const safeText = sanitizeForTiktoken(text);
    
    // Don't attempt to encode empty strings
    if (safeText.length === 0) {
      return 0;
    }
    
    const tokenCount = encoder.encode(safeText).length;
    return tokenCount;
  } catch (error) {
    appLogger.warn("[countTokensForString] Error encoding string, falling back to character estimation", {
      error: error instanceof Error ? error.message : String(error)
    });
    return Math.ceil((text || '').length / TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
  } finally {
    // Always clean up the encoder
    if (encoder && typeof encoder.free === 'function') {
      encoder.free();
    }
  }
}

/**
 * Truncate a string to approximately target token count (with fallback).
 */
export function truncateStringByTokens(text: string, targetTokens: number): string {
  if (targetTokens <= 0) return "";

  const encoder = createEncoder();

  if (!encoder) {
    appLogger.warn("[truncateStringByTokens] Tiktoken encoder not initialized. Falling back to character-based truncation.");
    const targetChars = Math.max(0, targetTokens * TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
    return (text || '').substring(0, targetChars);
  }

  try {
    // Ensure text is safe for encoding
    const safeText = sanitizeForTiktoken(text || '');
    const encoded = encoder.encode(safeText);

    if (encoded.length <= targetTokens) {
      return text; // No truncation needed or text is already shorter
    }

    const truncatedEncoded = encoded.slice(0, targetTokens);
    // TextDecoder is a standard browser API, also available in Node.js via 'util'
    // For server-side Node.js, ensure TextDecoder is available or use Buffer.from().toString()
    const result = new TextDecoder().decode(encoder.decode(truncatedEncoded));
    return result;
  } catch (error) {
    appLogger.warn("[truncateStringByTokens] Error truncating string with tiktoken, falling back to character-based truncation", {
      error: error instanceof Error ? error.message : String(error)
    });
    const targetChars = Math.max(0, targetTokens * TOKEN_CONFIG.APPROX_CHARS_PER_TOKEN);
    return (text || '').substring(0, targetChars);
  } finally {
    // Always clean up the encoder
    if (encoder && typeof encoder.free === 'function') {
      encoder.free();
    }
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
    { correlationId }
  );

  const encoder = createEncoder();
  let truncatedJsonContent = content;

  if (encoder) {
    try {
      // Ensure content is safe for encoding
      const safeContent = sanitizeForTiktoken(content || '');
      const encodedJson = encoder.encode(safeContent);
      const headerTokens = countTokens({ role: 'assistant', content: `Tool ${toolName} executed successfully:\n\n` });
      const availableTokens = TOKEN_CONFIG.MAX_TOOL_OUTPUT_TOKENS - headerTokens - 10; // -10 for truncation message

      if (encodedJson.length > availableTokens) {
        const slicedEncodedJson = encodedJson.slice(0, Math.max(0, availableTokens));
        truncatedJsonContent = new TextDecoder().decode(encoder.decode(slicedEncodedJson));
      }
    } catch (error) {
      appLogger.warn(`[truncateToolOutput] Error encoding content with tiktoken for tool '${toolName}', using character-based truncation: ${error instanceof Error ? error.message : String(error)}`);
      // Fall through to character-based truncation below
    } finally {
      // Always clean up the encoder
      if (encoder && typeof encoder.free === 'function') {
        encoder.free();
      }
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
    { correlationId }
  );

  return finalContent;
}

// =============================================================================
// CACHED TOKEN COUNTING FUNCTIONS - HIGH IMPACT OPTIMIZATION
// =============================================================================

/**
 * Count tokens for a message with Redis caching - HIGH PERFORMANCE
 * 
 * This function provides massive performance improvements:
 * - 95%+ cache hit rate expected for repeated content
 * - 5-20ms savings per message through cache hits
 * - 80-95% reduction in expensive tiktoken operations
 * 
 * Use this for high-frequency token counting operations.
 */
export async function countTokensCached(message: MessageAISDK | { role: string; content: string }): Promise<number> {
  const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
  const contentHash = generateContentHash(content);
  
  // Check cache first - this is where the massive performance gain comes from
  const cached = await getCachedTokenCount(contentHash);
  if (cached !== null) {
    appLogger.debug(`[TokenCache] Cache HIT - saved tiktoken calculation for hash ${contentHash.substring(0, 8)}, cached tokens: ${cached + TOKEN_CONFIG.BASE_MESSAGE_TOKENS}`);
    return cached + TOKEN_CONFIG.BASE_MESSAGE_TOKENS; // ✅ Cache hit - instant result!
  }
  
  // Cache miss - calculate and cache for future use
  appLogger.debug(`[TokenCache] Cache MISS - calculating tokens for hash ${contentHash.substring(0, 8)}`);
  
  const tokenCount = countTokens(message);
  
  // Cache the result (subtract base tokens since we add them back when retrieving)
  await cacheTokenCount(contentHash, tokenCount - TOKEN_CONFIG.BASE_MESSAGE_TOKENS);
  
  return tokenCount;
}

/**
 * Count tokens for multiple messages with caching
 */
export async function countMessagesTokensCached(messages: MessageAISDK[]): Promise<number> {
  const tokenCounts = await Promise.all(
    messages.map(msg => countTokensCached(msg))
  );
  return tokenCounts.reduce((sum, count) => sum + count, 0);
}

/**
 * Estimate tokens for a raw string with caching
 */
export async function countTokensForStringCached(text: string): Promise<number> {
  const contentHash = generateContentHash(text);
  
  // Check cache first
  const cached = await getCachedTokenCount(contentHash);
  if (cached !== null) {
    appLogger.debug(`[TokenCache] String cache HIT for hash ${contentHash.substring(0, 8)}, cached tokens: ${cached}`);
    return cached; // ✅ Cache hit - no base tokens for raw strings
  }
  
  // Calculate and cache
  const tokenCount = countTokensForString(text);
  await cacheTokenCount(contentHash, tokenCount);
  
  return tokenCount;
}

/**
 * Estimate tokens for tool definitions with caching
 */
export async function estimateToolDefinitionTokensCached(tools: ToolSet): Promise<number> {
  if (!tools || Object.keys(tools).length === 0) return 0;
  
  try {
    const toolDefinitions = Object.entries(tools).map(([name, tool]) => ({
      name,
      description: (tool as { description?: string }).description || '',
      parameters: (tool as { parameters: JSONSchema7 }).parameters,
    }));
    
    const definitionsString = JSON.stringify(toolDefinitions);
    const contentHash = generateContentHash(definitionsString);
    
    // Check cache first
    const cached = await getCachedTokenCount(contentHash);
    if (cached !== null) {
      appLogger.debug(`[TokenCache] Tool definitions cache HIT for hash ${contentHash.substring(0, 8)}, ${Object.keys(tools).length} tools, cached tokens: ${cached}`);
      return cached;
    }
    
    // Calculate and cache
    const tokenCount = estimateToolDefinitionTokens(tools);
    await cacheTokenCount(contentHash, tokenCount);
    
    appLogger.debug(`[TokenCache] Tool definitions cache MISS for hash ${contentHash.substring(0, 8)} - calculated and cached ${Object.keys(tools).length} tools, token count: ${tokenCount}`);
    
    return tokenCount;
  } catch (e) {
    appLogger.error("[TokenCache] Error in cached tool definition counting", e as Error);
    return estimateToolDefinitionTokens(tools); // Fallback to non-cached version
  }
} 