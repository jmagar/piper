import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import path from 'path';

import { initChatModel } from '../../init-chat-model.js';
import { loadConfig } from '../../load-config.js';

interface PromptOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Service for handling prompt-related operations
 */
export class PromptService {
  private readonly llm: BaseChatModel;

  constructor() {
    // Use the correct path resolution logic for the config file
    const configPath = path.join(
      process.cwd().endsWith('/backend') 
        ? path.join(process.cwd(), '..') 
        : process.cwd(),
      'llm_mcp_config.json5'
    );
    
    const config = loadConfig(configPath);
    this.llm = initChatModel({
      modelProvider: config.llm.model_provider,
      model: config.llm.model || 'claude-3-sonnet-20240229',
      temperature: config.llm.temperature || 0.7,
      maxTokens: config.llm.max_tokens || 1000
    });
  }

  /**
   * Strips any JSON structure or formatting from the text
   */
  private cleanResponse(text: string): string {
    // Remove any JSON-like structure
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.enhancedPrompt) {
          return parsed.enhancedPrompt.trim();
        }
      } catch {
        // If JSON parsing fails, continue with other cleaning
      }
    }

    // Remove markdown formatting
    return text
      .replace(/^```[\s\S]*```$/gm, '') // Remove code blocks
      .replace(/^#+\s+/gm, '') // Remove headers
      .replace(/^\s*[-*]\s+/gm, '') // Remove list markers
      .replace(/^"(.*)"$/gm, '$1') // Remove surrounding quotes
      .replace(/^\s*Enhanced prompt:\s*/i, '') // Remove labels
      .trim();
  }

  /**
   * Enhance a prompt for better AI interaction
   */
  async enhancePrompt(prompt: string, _options?: PromptOptions) {
    try {
      const systemPrompt = `You help users write better prompts that will get high-quality responses from AI.

Example input: "How to bake cookies?"
Example output: Please provide a detailed recipe for homemade chocolate chip cookies, including:
- List of ingredients with exact measurements
- Required equipment and tools
- Step-by-step mixing and preparation instructions
- Oven temperature and baking time
- Tips for achieving soft, chewy texture
- Common mistakes to avoid
- Storage recommendations

Example input: "Write email to boss"
Example output: Please help me draft a professional email to my supervisor requesting time off. I need to include:
- Specific dates for my planned leave
- Clear reason for the time off
- Status updates on my current projects
- Plan for handling my responsibilities while away
- Any important deadlines during my absence
- Who to contact in my absence

CRITICAL: Return ONLY the enhanced prompt text. No explanations, no JSON, no formatting, no quotes. The text will be inserted directly into a chat input field.`;

      const userPrompt = `Help me write a better prompt to get a high-quality response for this question: ${prompt}`;

      const messages: BaseMessage[] = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ];

      const response = await this.llm.invoke(messages);
      const rawContent = typeof response.content === 'string' 
        ? response.content
        : Array.isArray(response.content)
          ? response.content.map(c => typeof c === 'string' ? c : '').join(' ')
          : '';

      const enhancedPrompt = this.cleanResponse(rawContent);

      return {
        enhancedPrompt,
        explanation: 'Prompt enhanced for better clarity and effectiveness.'
      };
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      throw new Error('Failed to enhance prompt: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
} 