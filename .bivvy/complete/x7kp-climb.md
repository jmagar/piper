**STARTFILE x7kp-climb.md**
<Climb>
  <header>
    <id>x7kp</id>
    <type>feature</type>
    <description>Implement @mention tools functionality in chat input to allow users to directly invoke tools (similar to @mention agents)</description>
  </header>
  <newDependencies>None - will reuse existing patterns and components</newDependencies>
  <prerequisiteChanges>None - builds on existing @mention agent functionality</prerequisiteChanges>
  <relevantFiles>
    - app/components/chat-input/chat-input.tsx (main chat input component)
    - app/components/chat-input/use-agent-command.ts (hook handling @mention logic)
    - app/components/chat-input/agent-command.tsx (dropdown component for agent selection)
    - lib/tools/index.ts (tool registry with available tools)
    - app/api/tools-available/route.ts (API for fetching available tools)
    - app/api/chat/route.ts (chat endpoint that processes messages)
  </relevantFiles>
  <everythingElse>
    
## Feature Overview

**Feature Name**: @mention Tools in Chat Input
**Purpose**: Allow users to @mention specific tools (like @exa.webSearch) directly in chat input to invoke them immediately, similar to how @mention agents works
**Problem Being Solved**: Currently users can only invoke tools indirectly through agents. This feature provides direct tool invocation for faster workflows.
**Success Metrics**: Users can type @tool_name to get a dropdown of available tools, select one, and have it invoked directly

## Requirements

### Functional Requirements
1. Extend existing @mention pattern to support both agents and tools
2. Use different trigger patterns: @agent_name for agents, @tool_name for tools
3. Show filtered dropdown of available tools when @mention tools pattern is detected
4. Handle tool parameter input (simple string input initially, can be enhanced later)
5. Submit tool invocation as part of the chat message
6. Display tool results in chat similar to how agent tool invocations are shown

### Technical Requirements
- Reuse existing @mention infrastructure (hook pattern, dropdown component)
- Maintain backward compatibility with @mention agents
- Support keyboard navigation in tool dropdown (arrow keys, enter, escape)
- Respect tool availability (only show available tools)
- Handle tool invocation through existing chat API

### User Requirements
- Intuitive UX similar to @mention agents
- Clear visual distinction between agent mentions and tool mentions
- Immediate feedback when tool is selected
- Error handling for tool invocation failures

## Design and Implementation

### User Flow
1. User types @ in chat input
2. System detects if it's an agent mention (@agent_name) or tool mention (@tool.name - contains dot)
3. For tool mentions, show dropdown with filtered available tools
4. User selects tool via click or keyboard
5. System prompts for tool parameters (initially just a query string)
6. Tool invocation is included in chat message
7. Tool result is displayed in chat

### Architecture Overview
- Extend `use-agent-command.ts` hook to handle both agents and tools
- Create new `tool-command.tsx` component for tool dropdown (or extend agent-command)
- Modify chat input to support dual @mention types
- Update chat API to handle direct tool invocations

### API Specifications
- Reuse `/api/tools-available` for fetching tool list
- Extend chat message format to include direct tool invocations
- Tools invoked directly should bypass agent selection

### Data Models
```typescript
type ToolMention = {
  type: 'tool'
  toolId: string
  parameters: Record<string, unknown>
}

type ChatMessage = {
  // existing fields...
  toolMentions?: ToolMention[]
}
```

## Development Details

### Implementation Approach
1. **Phase 1**: Extend @mention detection to distinguish agent vs tool patterns
2. **Phase 2**: Create tool dropdown component and tool selection logic
3. **Phase 3**: Handle tool parameter input (start with simple string query)
4. **Phase 4**: Integrate tool invocation with chat API
5. **Phase 5**: Display tool results in chat interface

### Technical Considerations
- Tools and agents use different naming patterns (tools have dots: exa.webSearch)
- Need to handle tool parameters - start simple with just query string
- Tool results should be displayed clearly in chat
- Consider rate limiting for direct tool invocations
- Error handling for invalid tool parameters

### Security Considerations
- Validate tool availability before invocation
- Sanitize tool parameters
- Maintain existing authentication requirements
- Rate limiting to prevent abuse

## Testing Approach

### Test Cases
- @mention detection works for both agents (@agent) and tools (@tool.name)
- Tool dropdown shows only available tools
- Tool selection updates input correctly
- Tool parameters are captured correctly
- Tool invocation succeeds through chat API
- Tool results display properly in chat

### Edge Cases
- Partial tool names in @mention
- Invalid tool parameters
- Tool invocation failures
- Mixed agent and tool mentions in same message
- Network failures during tool invocation

## Future Considerations

### Enhancement Ideas
- Rich parameter input forms for complex tools
- Tool chaining capabilities
- Tool usage analytics
- Custom tool aliases
- Tool favorites/bookmarks

### Known Limitations
- Initial implementation will use simple string parameters
- No complex parameter validation initially
- Single tool invocation per message initially

  </everythingElse>
</Climb>
**ENDFILE** 