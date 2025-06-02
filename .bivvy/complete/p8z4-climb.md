**STARTFILE p8z4-climb.md**
<Climb>
  <header>
    <id>p8z4</id>
    <type>feature</type>
    <description>Extend @mention functionality to include rules (@rulename) allowing users to reference and apply database-stored rules directly in chat</description>
  </header>
  <newDependencies>None - builds on existing @mention infrastructure</newDependencies>
  <prerequisiteChanges>None - extends completed x7kp climb @mention tools functionality</prerequisiteChanges>
  <relevantFiles>
    - app/components/chat-input/use-agent-command.ts (mention detection hook)
    - app/components/chat-input/chat-input.tsx (main chat input component)  
    - app/components/chat-input/tool-command.tsx (dropdown component to extend)
    - app/api/rules/route.ts (existing rules API endpoint)
    - app/api/chat/route.ts (chat endpoint for processing rule mentions)
    - app/components/rules/ (existing rule components for reference)
  </relevantFiles>
  <everythingElse>
    
## Feature Overview

**Feature Name**: @mention Rules in Chat Input
**Purpose**: Allow users to @mention specific database-stored rules (created through the rules interface) to reference and apply them directly in chat conversations
**Problem Being Solved**: Currently users must manually reference rules. This feature provides direct rule injection into chat context for more informed AI responses.
**Success Metrics**: Users can type @rule_name to get a dropdown of available rules, select one, and have it applied to their chat context

## Requirements

### Functional Requirements
1. Extend existing @mention system to support agents, tools, AND rules (3-way detection)
2. Use pattern: @agent_name for agents, @tool_name for tools, @rule_name for rules
3. Show filtered dropdown of available rules when @mention rules pattern is detected
4. Handle rule selection by injecting rule content into chat context
5. Display rule application confirmation in chat interface
6. Support both rule title-based and filename-based matching

### Technical Requirements
- Extend existing @mention infrastructure (hook pattern, dropdown component)
- Maintain backward compatibility with @mention agents and tools
- Support keyboard navigation in rules dropdown
- Fetch rules from database via existing API endpoints
- Use rule metadata (name, description, system_prompt) from database
- Handle rule content injection through existing chat API

### User Requirements
- Intuitive UX consistent with existing @mention system
- Clear visual distinction between agent, tool, and rule mentions
- Immediate feedback when rule is selected
- Rule content should enhance AI responses with relevant context

## Design and Implementation

### User Flow
1. User types @ in chat input
2. System detects if it's agent (@agent), tool (@tool), or rule (@rule) mention via fuzzy matching
3. For rule mentions, show dropdown with filtered available rules
4. User selects rule via click or keyboard
5. Rule content is injected into chat context (system prompt or message history)
6. Rule application is confirmed to user
7. AI responds with rule context applied

### Architecture Overview
- Extend `use-agent-command.ts` hook to handle agents, tools, AND rules (3-way)
- Create new `rule-command.tsx` component for rule dropdown (or extend existing)
- Create `/api/rules-available` endpoint to fetch rule metadata
- Update chat API to handle rule mentions and context injection

### API Specifications
- Extend existing `/api/rules` endpoint or create `/api/rules-available` for @mention dropdown
- Extend chat message format to include rule mentions
- Rules applied should enhance system context without replacing it

### Data Models
```typescript
type RuleMention = {
  type: 'rule'
  ruleId: string // database rule ID
  ruleName: string // rule name
  ruleSlug: string // rule slug
  ruleContent: string // system_prompt content
}

type ChatMessageWithRules = {
  // existing fields...
  ruleMentions?: RuleMention[]
}
```

## Development Details

### Implementation Approach
1. **Phase 1**: Create rules API endpoint to fetch database rules for @mention dropdown
2. **Phase 2**: Extend @mention detection for 3-way (agent/tool/rule) fuzzy matching  
3. **Phase 3**: Create rule dropdown component and rule selection logic
4. **Phase 4**: Integrate rule mention parsing and context injection with chat API
5. **Phase 5**: Display rule application confirmation in chat interface

### Technical Considerations
- Rules stored in database with existing schema (id, name, description, slug, system_prompt)
- Use existing rule API endpoints for fetching rule data
- Rule content (system_prompt) should enhance system context, not overwhelm it
- Consider rule content length limits for token usage
- Fuzzy matching should work on both rule name and description

### Security Considerations
- Validate rule file paths to prevent directory traversal
- Sanitize rule content before injection
- Maintain existing authentication requirements
- Consider rate limiting for rule applications

## Testing Approach

### Test Cases
- @mention detection works for agents, tools, AND rules
- Rule dropdown shows only available rules from .cursor/rules/
- Rule selection updates chat context correctly
- Rule content is properly injected into AI conversation
- Rule application confirmation displays in chat

### Edge Cases
- Empty or corrupted rule files
- Rules with invalid frontmatter
- Very large rule content
- Mixed mentions (agent + tool + rule in same message)
- Network failures during rule loading

## Future Considerations

### Enhancement Ideas
- Rule composition (multiple rules in one mention)
- Custom rule collections/favorites
- Rule usage analytics and recommendations
- Rule editing interface within chat
- Rule dependency tracking

### Known Limitations
- Initial implementation will inject full rule content
- No rule composition in single mention initially
- Basic rule metadata parsing

  </everythingElse>
</Climb>
**ENDFILE** 