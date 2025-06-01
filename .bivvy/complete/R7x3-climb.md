<Climb>
  <header>
    <id>R7x3</id>
    <type>feature</type>
    <description>Implement modal agent editing/deletion and create Rules feature with @mention functionality</description>
  </header>
  <newDependencies>None - using existing infrastructure</newDependencies>
  <prerequisitChanges>None - building on existing agent system</prerequisitChanges>
  <relevantFiles>
    - app/components/agents/agent-detail.tsx
    - app/components/agents/dialog-create-agent/
    - app/api/create-agent/route.ts
    - app/api/delete-agent/[id]/route.ts
    - app/agents/[...agentSlug]/page.tsx
    - prisma/schema.prisma
    - lib/config.ts
  </relevantFiles>
  <everythingElse>
## Feature Overview

**Feature Name**: Modal Agent Edit/Delete + Rules System
**Purpose**: Allow users to edit/delete agents directly from modal views and create a simplified Rules system for reusable prompt snippets that can be @mentioned in conversations.

**Problem Being Solved**: 
1. Users currently can only delete agents from the full page view, not from modal
2. Need a way to store and reuse prompt snippets/rules that can be easily referenced in conversations
3. Users want to @mention rules similar to how they @mention agents

**Success Metrics**:
- Users can edit/delete agents from any view
- Rules can be created, managed, and @mentioned in conversations
- Rules are successfully appended to messages when mentioned

## Requirements

**Functional Requirements**:
1. Modal Agent Management:
   - Edit agent button in modal view
   - Delete agent button in modal view
   - Edit functionality opens agent editing form
   - Delete functionality works same as full page

2. Rules System:
   - Create rules with name, description, system prompt
   - List/browse existing rules
   - Edit existing rules
   - Delete rules
   - @mention rules in chat (similar to agent mentions)
   - Rules get appended to messages when mentioned

**Technical Requirements**:
- Reuse existing agent infrastructure where possible
- Rules stored in database (similar to agents)
- Rules accessible via API endpoints
- Rules integrated into chat mention system

**User Requirements**:
- Intuitive interface matching agent patterns
- Seamless @mention integration
- Clear distinction between agents and rules

## Design and Implementation

**User Flow**:
1. Modal Agent Management:
   - User opens agent modal → sees edit/delete options
   - Edit opens form with current values → user modifies → saves
   - Delete shows confirmation → user confirms → agent deleted

2. Rules Management:
   - User navigates to Rules section
   - Can create new rule with name/description/prompt
   - Can browse/edit/delete existing rules
   - In chat, user types @rule-name → rule prompt appended

**Architecture Overview**:
- Rules table in database (similar to agents)
- Rules API endpoints (/api/rules/, /api/create-rule/, etc.)
- Rules components (mirroring agent components)
- Rules integration in chat mention system

**Data Models**:
```typescript
// Rules table
type Rule = {
  id: string
  slug: string  
  name: string
  description: string
  system_prompt: string
  createdAt: Date
  updatedAt: Date
}
```

**API Specifications**:
- GET /api/rules - list rules
- POST /api/create-rule - create new rule
- PUT /api/update-rule/[id] - update rule
- DELETE /api/delete-rule/[id] - delete rule

## Development Details

**Implementation Considerations**:
- Modal agent editing requires state management for form data
- Rules mention system needs to integrate with existing chat infrastructure
- Rules should have URL routing (/rules/[slug])
- Reuse as much agent code as possible for consistency

**Dependencies**:
- Existing Prisma setup
- Existing modal/dialog components
- Existing mention detection system

**Security Considerations**:
- Same auth requirements as agents
- Validate rule content/prompts
- Sanitize user input

## Testing Approach

**Test Cases**:
- Modal edit/delete functionality
- Rule creation/editing/deletion
- Rule @mention detection and appending
- URL routing for rules
- Database operations

**Acceptance Criteria**:
- Can edit agents from modal view
- Can delete agents from modal view  
- Can create/edit/delete rules
- Can @mention rules in chat
- Rules properly append to messages
- Rules have working detail pages

**Edge Cases**:
- Invalid rule mentions
- Deleted rule mentions
- Concurrent editing
- Empty rule prompts

## Future Considerations

**Scalability Plans**:
- Rule categories/tagging
- Rule sharing between users
- Rule templates

**Enhancement Ideas**:
- Rule versioning
- Rule usage analytics
- Rule combinations
- Rule variables/parameters

**Known Limitations**:
- Rules are simple text appends (no complex logic)
- No rule nesting or composition in initial version
</everythingElse>
</Climb> 