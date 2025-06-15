export type ToolMention = {
  type: 'tool'
  toolId: string // The full ID like "server_key_tool_name"
  toolName: string // The original tool name
  serverId: string
  serverLabel: string
  parameters: Record<string, unknown>
}

export type PromptMention = {
  type: 'prompt'
  promptId: string // Database prompt ID
  promptName: string // Prompt name
  promptSlug: string // Prompt slug for @mentions
  promptContent: string // Prompt system_prompt content
}

export type ChatMessageWithMentions = {
  // Extend existing chat message types with tool and rule mentions
  toolMentions?: ToolMention[]
  promptMentions?: PromptMention[]
  urlMentions?: UrlMention[];
  fileMentions?: FileMention[];
}

// Helper function to parse tool mentions from message text

export type FileMention = {
  type: 'file';
  path: string; // The path extracted from the mention, e.g., "images/photo.jpg"
  fullMention: string; // The full mention string, e.g., "@files/images/photo.jpg"
};

export type UrlMention = {
  type: 'url';
  url: string; // The full URL
  rawMention: string; // The raw @url/... string
};

// Helper function to parse URL mentions from message text
export function parseUrlMentions(text: string): UrlMention[] {
  const urlMentionRegex = /@url\/(https?:\/\/[^\s@]+)/g;
  const mentions: UrlMention[] = [];
  let match;

  while ((match = urlMentionRegex.exec(text)) !== null) {
    const rawMention = match[0];
    const url = match[1];
    
    // Basic validation to ensure it's a plausible URL structure
    // More robust validation could be added if needed
    if (url && url.startsWith('http')) {
      mentions.push({
        type: 'url',
        url,
        rawMention,
      });
    } else {
      console.warn('Skipping invalid URL mention:', rawMention);
    }
  }
  return mentions;
}

// Helper function to remove URL mentions from text
export function stripUrlMentions(text: string): string {
  return text.replace(/@url\/(https?:\/\/[^\s@]+)/g, '').trim();
}

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

// Helper function to parse prompt mentions from message text
export function parsePromptMentions(text: string): PromptMention[] {
  const promptMentionRegex = /@([\w-]+)(?!\()/g // Prompt mentions without parentheses
  const mentions: PromptMention[] = []
  let match

  while ((match = promptMentionRegex.exec(text)) !== null) {
    const [, promptSlug] = match
    
    mentions.push({
      type: 'prompt',
      promptId: '', // Will be filled when we lookup the prompt in database
      promptName: '', // Will be filled when we lookup the prompt in database
      promptSlug,
      promptContent: '' // Will be filled when we lookup the prompt in database
    })
  }

  return mentions
}


// Helper function to parse file mentions from message text
export function parseFileMentions(text: string): FileMention[] {
  const fileMentionRegex = /@files\/([^@\s]+)/g;
  const mentions: FileMention[] = [];
  let match;

  while ((match = fileMentionRegex.exec(text)) !== null) {
    const fullMention = match[0];
    const path = match[1];
    
    if (path) {
      mentions.push({
        type: 'file',
        path,
        fullMention,
      });
    } else {
      console.warn('Skipping invalid file mention:', fullMention);
    }
  }
  return mentions;
}

// Helper function to remove file mentions from text
export function stripFileMentions(text: string): string {
  return text.replace(/@files\/([^@\s]+)/g, '').trim();
}

// Helper function to remove prompt mentions from text
export function stripPromptMentions(text: string): string {
  return text.replace(/@[\w-]+(?!\()/g, '').trim()
}

// Helper function to remove both tool and rule mentions from text
export function stripAllMentions(text: string): string {
  return stripFileMentions(stripPromptMentions(stripToolMentions(stripUrlMentions(text))));
} 