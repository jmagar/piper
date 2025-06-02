export type ToolMention = {
  type: 'tool'
  toolId: string // The full ID like "server_key_tool_name"
  toolName: string // The original tool name
  serverId: string
  serverLabel: string
  parameters: Record<string, unknown>
}

export type RuleMention = {
  type: 'rule'
  ruleId: string // Database rule ID
  ruleName: string // Rule name
  ruleSlug: string // Rule slug for @mentions
  ruleContent: string // Rule system_prompt content
}

export type ChatMessageWithMentions = {
  // Extend existing chat message types with tool and rule mentions
  toolMentions?: ToolMention[]
  ruleMentions?: RuleMention[]
}

// Helper function to parse tool mentions from message text
export function parseToolMentions(text: string): ToolMention[] {
  const toolMentionRegex = /@(\w+)\(([^)]+)\)/g
  const mentions: ToolMention[] = []
  let match

  while ((match = toolMentionRegex.exec(text)) !== null) {
    const [, toolName, parametersString] = match
    
    try {
      const parameters = JSON.parse(parametersString)
      
      mentions.push({
        type: 'tool',
        toolId: '', // Will be filled when we have server context
        toolName,
        serverId: '', // Will be filled when we have server context  
        serverLabel: '', // Will be filled when we have server context
        parameters
      })
    } catch (error) {
      console.warn('Failed to parse tool mention parameters:', parametersString, error)
    }
  }

  return mentions
}

// Helper function to remove tool mentions from text
export function stripToolMentions(text: string): string {
  return text.replace(/@\w+\([^)]+\)/g, '').trim()
}

// Helper function to parse rule mentions from message text
export function parseRuleMentions(text: string): RuleMention[] {
  const ruleMentionRegex = /@([\w-]+)(?!\()/g // Rule mentions without parentheses
  const mentions: RuleMention[] = []
  let match

  while ((match = ruleMentionRegex.exec(text)) !== null) {
    const [, ruleSlug] = match
    
    mentions.push({
      type: 'rule',
      ruleId: '', // Will be filled when we lookup the rule in database
      ruleName: '', // Will be filled when we lookup the rule in database
      ruleSlug,
      ruleContent: '' // Will be filled when we lookup the rule in database
    })
  }

  return mentions
}

// Helper function to remove rule mentions from text
export function stripRuleMentions(text: string): string {
  return text.replace(/@[\w-]+(?!\()/g, '').trim()
}

// Helper function to remove both tool and rule mentions from text
export function stripAllMentions(text: string): string {
  return stripRuleMentions(stripToolMentions(text))
} 