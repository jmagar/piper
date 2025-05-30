# Dynamic MCP Server Selection for Agent Creation

## Climb Details
**ID**: mK9p  
**Type**: feature  
**Description**: Enhance the agent creation form to dynamically load and display available MCP servers from config.json instead of using hardcoded options  

### New Dependencies
None - will use existing infrastructure (config loading system, MCP manager, existing UI components)

### Prerequisite Changes
- MCP configuration system is already functional (confirmed in codebase)
- Agent creation form exists and is working (confirmed in UI)
- API endpoint `/api/mcp-servers` exists for server information
- Backend `/api/create-agent` already accepts flexible `mcp_config` field (not restricted to hardcoded values)

### Relevant Files
- `app/components/agents/dialog-create-agent/create-agent-form.tsx` - Main form component with hardcoded MCP dropdown
- `app/components/agents/dialog-create-agent/dialog-trigger-create-agent.tsx` - Form state management and submission
- `app/api/create-agent/route.ts` - Agent creation API endpoint (expects `mcp_config` field)
- `config.json` - MCP server configuration source
- `lib/mcp/client.ts` - Configuration loading utilities
- `lib/mcp/mcpManager.ts` - MCP server management
- `app/api/mcp-servers/route.ts` - Existing server info API

## Feature Overview

### Purpose Statement
Replace the hardcoded MCP server options ("none", "git-mcp") in the agent creation form with a dynamic list loaded from the actual MCP server configuration, allowing users to select from all available and enabled MCP servers.

### Problem Being Solved
- **Current State**: Agent creation form only shows 2 hardcoded MCP options despite having 11+ configured MCP servers
- **User Pain Point**: Users cannot utilize the majority of available MCP servers when creating agents
- **System Inconsistency**: UI doesn't reflect actual system capabilities shown in MCP dashboard
- **API Field Mismatch**: Form sends `mcp` field but API expects `mcp_config` field

### Success Metrics
- All enabled MCP servers from config.json appear in the agent creation dropdown
- Form submission correctly handles selected MCP server keys in `mcp_config` field
- No regression in existing "none" and "git-mcp" functionality
- Consistent server naming between agent creation and MCP dashboard

## Requirements

### Functional Requirements
1. **Dynamic Server Loading**: Form must fetch available MCP servers on component mount
2. **Server Filtering**: Only show enabled (non-disabled) MCP servers in dropdown
3. **Proper Labeling**: Use server labels from config, fall back to server keys for display names
4. **Legacy Support**: Continue to support existing "none" option
5. **Server Status Awareness**: Optionally indicate server connection status in dropdown
6. **Form Validation**: Validate selected MCP server exists and is enabled
7. **API Field Alignment**: Fix mismatch between form `mcp` field and API `mcp_config` field

### Technical Requirements
- Use existing `/api/mcp-servers` endpoint or create dedicated endpoint for agent creation
- Maintain existing form submission format with proper field mapping (`mcp` → `mcp_config`)
- No performance impact on form loading (<500ms server fetch)
- Type safety for new MCP selection options
- Follow existing API patterns under `/api/agents/` directory

### User Requirements
- Clear indication of available MCP servers
- Intuitive server selection experience matching existing UI patterns
- Immediate feedback if selected server becomes unavailable
- Graceful fallback if server list cannot be loaded

## Design and Implementation

### User Flow
1. User clicks "Create an agent" button
2. Form dialog opens and immediately fetches available MCP servers
3. MCP dropdown populates with:
   - "None" (default option)
   - All enabled MCP servers (using display labels)
4. User selects desired MCP server from list
5. Form submission maps selected value to `mcp_config` field for API
6. Agent is created with specified MCP configuration

### Architecture Overview
```
Agent Creation Form
    ↓ (fetch on mount)
API Endpoint (/api/agents/mcp-options)
    ↓ (reads from)
Config.json (via getAppConfig())
    ↓ (returns)
Filtered MCP Server List
    ↓ (populates)
Select Dropdown Component
    ↓ (form submission)
Map mcp → mcp_config
    ↓ (POST)
/api/create-agent (existing)
```

### API Specification
**New Endpoint**: `GET /api/agents/mcp-options`
```typescript
Response: {
  servers: Array<{
    key: string;        // Server key from config
    label: string;      // Display name (label || key)
    transportType: string; // 'sse' | 'stdio' | 'custom'
    status?: string;    // Optional connection status
  }>
}
```

### Data Model Changes
```typescript
// Update AgentFormData type
type AgentFormData = {
  name: string
  description: string
  systemPrompt: string
  mcp: string  // Changed from "none" | "git-mcp" to string
  repository?: string
  tools: string[]
}

// New interface for MCP options
interface MCPServerOption {
  key: string
  label: string
  transportType: string
  status?: string
}
```

### Form Submission Mapping
```typescript
// In dialog-trigger-create-agent.tsx
const apiPayload = {
  name: formData.name,
  description: formData.description,
  system_prompt: formData.systemPrompt,
  mcp_config: formData.mcp, // Map mcp → mcp_config for API
  repository: formData.mcp === "git-mcp" ? formData.repository : null,
  tools: formData.tools,
  // ... other fields
}
```

## Development Details

### Implementation Approach
1. **Create API Endpoint**: New `/api/agents/mcp-options` that returns filtered MCP servers using existing patterns
2. **Update Form Component**: Modify `create-agent-form.tsx` to fetch and display dynamic options
3. **Fix Field Mapping**: Update `dialog-trigger-create-agent.tsx` to map `mcp` → `mcp_config` in submission
4. **Update Type Definitions**: Change `AgentFormData.mcp` from union type to string
5. **Add Loading States**: Show loading spinner while fetching MCP options
6. **Error Handling**: Graceful fallback if MCP options can't be loaded

### Backend Readiness
- ✅ `/api/create-agent` already accepts any `mcp_config` value (no backend changes needed)
- ✅ MCP server management system exists and is functional
- ✅ Configuration loading utilities available in `lib/mcp/client.ts`
- ✅ Consistent API patterns established in `/api/agents/` directory

### Security Considerations
- No sensitive information exposed in MCP server list
- Validate selected MCP server exists and is enabled during form submission
- No additional authentication required (uses existing session)
- Follow existing error handling patterns from other agent APIs

## Testing Approach

### Test Cases
1. **Basic Functionality**: All enabled MCP servers appear in dropdown
2. **Server Filtering**: Disabled servers are excluded from list
3. **Fallback Behavior**: Form works when API call fails (shows default "none" option)
4. **Legacy Compatibility**: Existing agents with "git-mcp" continue to work
5. **Form Submission**: Selected MCP server key is correctly mapped to `mcp_config`
6. **Display Labels**: Server labels are used correctly, fallback to keys
7. **API Integration**: New endpoint follows existing agent API patterns

### Acceptance Criteria
- ✅ MCP dropdown shows all enabled servers from config.json
- ✅ "None" option remains available as default
- ✅ Server labels display correctly in dropdown
- ✅ Form submission correctly maps `mcp` → `mcp_config` for API
- ✅ Loading state shown while fetching servers
- ✅ Error state with fallback if fetch fails
- ✅ No breaking changes to existing agent creation flow
- ✅ New API endpoint follows `/api/agents/` conventions

### Edge Cases
- Config.json is malformed or missing
- All MCP servers are disabled
- Network timeout during server list fetch
- User selects server that becomes disabled before submission
- API endpoint returns error response

## Future Considerations

### Enhancement Ideas
- Server health indicators in dropdown (green/yellow/red status dots)
- MCP server descriptions/tooltips in dropdown
- Real-time server status updates in form
- Server capability preview (tool count, supported features)
- Integration with existing tools system from `TOOL_REGISTRY`
- Batch agent creation with different MCP servers

### Scalability Plans
- Paginated/searchable MCP server list for large configurations
- Caching of MCP server options with refresh capability
- Integration with server discovery/auto-configuration

### Known Limitations
- Current implementation doesn't validate server availability at form submission time
- No preview of MCP server capabilities in selection interface
- No guidance on which MCP server to choose for specific use cases
- Repository field still only shows for "git-mcp" selection (may need updates for other Git-based MCP servers) 