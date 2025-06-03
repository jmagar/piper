# MCP Server Communication Error Resolution

<Climb>
  <header>
    <id>K7m3</id>
    <type>bug</type>
    <description>Fix widespread EPIPE (Broken Pipe) errors and false abort signals affecting MCP server communication and tool execution</description>
    <newDependencies>None - using existing infrastructure</newDependencies>
    <prerequisitChanges>Timeout fixes are already in place, abort controller is temporarily disabled</prerequisitChanges>
    <relevantFiles>
      - lib/mcp/client.ts (MCP service communication)
      - lib/mcp/mcpManager.ts (MCP manager)
      - lib/mcp/enhanced-mcp-client.ts (Enhanced MCP client)
      - app/api/mcp-abort-tool/route.ts (Abort controller API)
    </relevantFiles>
    <everythingElse>
      **Problem Overview**
      Multiple MCP servers are experiencing BrokenPipeError (EPIPE) errors during initialization and communication, leading to:
      - Server crashes during startup
      - Tools falsely marked as "aborted by user" 
      - Inconsistent tool execution failures
      - Poor user experience with tool reliability

      **Root Causes Identified**
      1. **EPIPE Errors**: Child processes are being killed prematurely during initialization
      2. **False Abort Signals**: Even with abort controller disabled, tools still show "aborted by user"
      3. **Process Lifecycle Issues**: Child processes not properly managed during startup/shutdown
      4. **Communication Race Conditions**: Stdio communication timing issues

      **Impact**
      - High: Multiple MCP servers unable to function reliably
      - High: User tools failing with confusing error messages  
      - High: System appears broken to end users
      - Medium: Development workflow disrupted

      **Success Criteria**
      - All MCP servers initialize without EPIPE errors
      - No false "aborted by user" messages
      - Tools execute reliably without communication failures
      - Clean server startup and shutdown process
      - Stable stdio communication between client and servers

      **Technical Analysis**
      The EPIPE errors occur when:
      1. Child processes try to write to closed stdout/stdin pipes
      2. Parent process kills child before proper handshake completion
      3. Enhanced MCP client initialization conflicts with manual stdio handling
      4. Abort controller remnants still trigger despite being "disabled"

      **Implementation Strategy**
      1. Fix process lifecycle management in stdio tool execution
      2. Remove all abort controller references and registration
      3. Improve error handling for broken pipe scenarios
      4. Add proper process cleanup and error recovery
      5. Enhance initialization timeout handling
      6. Implement graceful process termination
    </everythingElse>
</Climb>

## Requirements

### Functional Requirements
- MCP servers must initialize without EPIPE errors
- Tool execution must complete without false abort messages
- Process communication must be stable and reliable
- Error messages must accurately reflect actual failure reasons
- Server startup must be robust and fault-tolerant

### Technical Requirements
- Remove all abort controller integration completely
- Fix stdio process lifecycle management
- Implement proper error handling for broken pipes
- Add graceful process termination
- Improve communication timeout handling
- Ensure clean resource cleanup

### Error Resolution Requirements
- Eliminate BrokenPipeError during server initialization
- Remove false "Tool execution aborted by user" messages
- Fix EPIPE errors in stdout_writer and stdin communication
- Resolve TaskGroup exception handling in MCP servers
- Ensure stable process exit handling

## Implementation Plan

### Phase 1: Clean Up Abort Controller Remnants
Remove all remaining abort controller code and references that may be causing false abort signals.

### Phase 2: Fix Process Lifecycle Management  
Improve how child processes are created, managed, and terminated to prevent EPIPE errors.

### Phase 3: Enhance Error Handling
Add proper error handling for broken pipe scenarios and improve communication robustness.

### Phase 4: Improve Initialization Process
Make MCP server initialization more robust with better timeout and error handling.

### Phase 5: Testing and Validation
Verify all MCP servers start cleanly and tools execute without false errors.

## Acceptance Criteria
- [ ] No EPIPE errors during MCP server initialization
- [ ] No false "aborted by user" tool execution errors  
- [ ] All configured MCP servers start successfully
- [ ] Tools execute reliably without communication failures
- [ ] Clean error messages that accurately reflect actual issues
- [ ] Stable system operation under normal use 