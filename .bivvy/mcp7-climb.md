<Climb>
  <header>
    <id>mcp7</id>
    <type>bug</type>
    <description>Fix MCP Tool typeName Error and Improve System Robustness</description>
  </header>
  <newDependencies>None - using existing infrastructure</newDependencies>
  <prerequisiteChanges>None required</prerequisiteChanges>
  <relevantFiles>
    - lib/mcp/modules/tool-collection-manager.ts
    - lib/mcp/modules/tool-definition-compressor.ts  
    - lib/mcp/enhanced/managed-client.ts
    - app/api/chat/lib/chat-orchestration.ts
    - lib/mcp/modules/service-registry.ts
  </relevantFiles>
  <everythingElse>
    ## Problem Statement
    
    The chat API is failing with "Cannot read properties of undefined (reading 'typeName')" when trying to list available MCP tools. This error occurs in the AI SDK when it processes malformed or undefined tool objects from the MCP system.
    
    ## Root Cause Analysis
    
    After comprehensive investigation using MECE methodology, I identified four potential failure points:
    
    1. **Tool Collection Manager**: May be adding undefined/null tools to the collection
    2. **Tool Definition Compressor**: May be corrupting tool structures during compression
    3. **Enhanced MCP Client**: Metrics wrapper might interfere with tool properties
    4. **Service Registry**: MCP services may return null/undefined tools
    
    The error occurs because AI SDK expects valid tool objects with proper structure, but receives undefined objects that are cast to valid types, masking the underlying issue.
    
    ## Technical Analysis
    
    **Data Flow:**
    ```
    MCP Server → Enhanced MCP Client → Service Registry → Tool Collection Manager → Tool Definition Compressor → AI SDK
    ```
    
    **Error Location:**
    The error occurs in AI SDK's `streamText()` when it tries to access `typeName` property on undefined objects passed through the `tools` parameter.
    
    **Critical Issues Found:**
    - Type casting `as NonNullable<ToolSet[string]>` masks undefined values
    - Missing null checks before tool processing
    - Tool Definition Compressor can return malformed objects
    - Service registry doesn't validate tool structure
    
    ## Solution Architecture
    
    Implement robust validation and null checking at multiple layers:
    
    1. **Service Registry Level**: Validate tools before registration
    2. **Collection Manager Level**: Filter out invalid tools with comprehensive validation
    3. **Compressor Level**: Ensure compression doesn't corrupt essential properties
    4. **Orchestration Level**: Final validation before passing to AI SDK
    
    ## Implementation Strategy
    
    **Phase 1: Immediate Fixes (High Priority)**
    - Add null/undefined checks in tool collection manager
    - Implement tool structure validation before AI SDK
    - Add error handling for malformed tools
    
    **Phase 2: Robustness Improvements (Medium Priority)**  
    - Enhance tool definition compressor safety
    - Improve service registry validation
    - Add comprehensive logging for debugging
    
    **Phase 3: Long-term Stability (Low Priority)**
    - Implement tool schema validation
    - Add automated health checks
    - Create fallback mechanisms
    
    ## Success Metrics
    
    - Chat API responds successfully to tool listing requests
    - Zero "typeName" errors in production logs
    - MCP tools properly available to assistant
    - Improved error handling and logging
    
    ## Risk Mitigation
    
    - Fallback to empty tool set if collection fails
    - Graceful degradation when individual tools fail
    - Enhanced logging for debugging future issues
    - Backward compatibility maintained
    
    ## Testing Strategy
    
    1. **Unit Tests**: Validate each component handles null/undefined inputs
    2. **Integration Tests**: End-to-end tool collection and usage
    3. **Error Simulation**: Inject malformed tools to test handling
    4. **Production Monitoring**: Monitor error rates after deployment
  </everythingElse>
</Climb> 