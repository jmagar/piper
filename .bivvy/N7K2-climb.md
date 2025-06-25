**STARTFILE N7K2-climb.md**
<Climb>
  <header>
    <id>N7K2</id>
    <type>bug</type>
    <description>Fix null pointer error in tiktoken encoder causing chat streaming failures</description>
  </header>
  <newDependencies>None - using existing tiktoken and AI SDK packages</newDependencies>
  <prerequisitChanges>None - this is a defensive programming fix</prerequisitChanges>
  <relevantFiles>
    - app/api/chat/lib/token-management.ts (main fix location)
    - app/api/chat/lib/message-processing.ts (input validation)
    - app/api/chat/route.ts (error handling)
    - app/components/chat-input/chat-input.tsx (frontend error display)
  </relevantFiles>
  <everythingElse>
    ## Problem Statement
    The chat interface displays "An error occurred" when users try to send messages. Backend logs show "[countTokens] Failed to encode string content even after sanitization" with "null pointer passed to rust" error. This indicates the tiktoken encoder (Rust-based) is receiving malformed data that bypasses current sanitization.

    ## Root Cause Analysis
    **Error Chain:**
    1. User message → Frontend chat API → Message processing → Token counting
    2. `countTokens()` function in token-management.ts calls `sanitizeForTiktoken()`
    3. Despite sanitization, encoder.encode() receives null/invalid data
    4. Tiktoken (Rust) panics with null pointer error
    5. Streaming fails → Frontend shows generic error

    **Sanitization Gaps:**
    Current `sanitizeForTiktoken()` function (lines 214-240) handles:
    - Null bytes (\0)
    - Invalid Unicode characters
    - Control characters
    - Unpaired surrogates
    - Unicode normalization

    **Missing Edge Cases:**
    - Buffer-like objects passed as strings
    - Circular references in JSON.stringify
    - Very large strings causing memory issues
    - Non-string types being coerced incorrectly
    - Malformed UTF-8 sequences
    - Zero-width characters that confuse tokenizer

    ## Success Metrics
    - Zero "null pointer passed to rust" errors in logs
    - 100% message send success rate in chat interface
    - Graceful fallback to character estimation when tokenization fails
    - Comprehensive error logging for debugging

    ## Technical Requirements
    - Enhance `sanitizeForTiktoken()` with additional edge case handling
    - Add pre-encoding validation before calling tiktoken
    - Implement circuit breaker for repeated encoding failures
    - Add structured error reporting with content analysis
    - Maintain performance (sub-10ms for typical messages)

    ## Implementation Strategy
    **Phase 1: Enhanced Sanitization**
    - Strengthen input validation and type checking
    - Add buffer detection and conversion
    - Handle circular reference detection
    - Implement string length limits for safety

    **Phase 2: Defensive Encoding**
    - Add pre-encoding validation step
    - Implement progressive sanitization (retry with stronger cleaning)
    - Add encoder state validation
    - Circuit breaker for problematic content

    **Phase 3: Error Handling**
    - Enhanced error logging with content fingerprinting
    - Frontend error message improvements
    - Monitoring and alerting for encoding issues

    ## Testing Approach
    - Unit tests with problematic Unicode sequences
    - Integration tests with malformed message content
    - Load testing with various content types
    - Error injection testing for graceful degradation

    ## Security Considerations
    - Ensure sanitization doesn't introduce new attack vectors
    - Prevent DoS through large string processing
    - Validate all user inputs before tokenization
    - Log security-relevant content patterns

    ## Performance Requirements
    - Maintain sub-10ms token counting for typical messages
    - Graceful degradation for large or complex content
    - Memory-efficient handling of edge cases
    - No blocking operations in the sanitization pipeline

    ## Rollback Plan
    - Keep existing fallback to character estimation
    - Feature flag for enhanced sanitization
    - Monitoring for performance regressions
    - Quick disable path if issues arise

    ## Future Considerations
    - Caching for expensive sanitization operations
    - Async token counting for very large content
    - Integration with AI SDK error reporting
    - Metrics collection for optimization
  </everythingElse>
</Climb>
**ENDFILE** 