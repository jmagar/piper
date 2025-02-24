import { BaseMemory, InputValues, OutputValues } from '@langchain/core/memory';
import { BaseMessage, MessageType } from '@langchain/core/messages';
import debug from 'debug';

const log = debug('mcp:memory');
const error = debug('mcp:memory:error');

export interface ChatMemoryOptions {
  windowSize?: number;
  returnMessages?: boolean;
}

interface StoredMessage {
  type: MessageType;
  content: string;
  name?: string;
  additionalKwargs?: Record<string, unknown>;
}

class CustomHumanMessage extends BaseMessage {
  _getType(): MessageType {
    return 'human';
  }
}

class CustomAIMessage extends BaseMessage {
  _getType(): MessageType {
    return 'ai';
  }
}

export class ChatMemory implements BaseMemory {
  private messages: StoredMessage[] = [];
  private windowSize: number;
  private returnMessages: boolean;

  constructor(options: ChatMemoryOptions = {}) {
    this.windowSize = options.windowSize ?? 5;
    this.returnMessages = options.returnMessages ?? true;
    log('Initialized chat memory with window size: %d', this.windowSize);
  }

  get memoryKeys(): string[] {
    return ['chat_history'];
  }

  private convertToMessage(stored: StoredMessage): BaseMessage {
    const messageData = {
      content: stored.content,
      additional_kwargs: {
        ...(stored.name && { name: stored.name }),
        ...(stored.additionalKwargs || {})
      }
    };

    return stored.type === 'human'
      ? new CustomHumanMessage(messageData)
      : new CustomAIMessage(messageData);
  }

  async loadMemoryVariables(_values: InputValues): Promise<{ chat_history: BaseMessage[] | string }> {
    try {
      const messages = this.messages.slice(-this.windowSize);
      
      if (this.returnMessages) {
        const convertedMessages = messages.map(m => this.convertToMessage(m));
        log('Returning %d messages from memory', convertedMessages.length);
        return { chat_history: convertedMessages };
      }

      // Convert to string format if returnMessages is false
      const messageString = messages
        .map(m => `${m.type}: ${m.content}`)
        .join('\n');
      
      log('Returning message history as string, length: %d', messageString.length);
      return { chat_history: messageString };
    } catch (err) {
      error('Failed to load memory variables: %s', err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  async saveContext(
    input: InputValues,
    output: OutputValues
  ): Promise<void> {
    try {
      const inputContent = input['input'] as string;
      const outputContent = output['output'] as string;

      this.messages.push(
        {
          type: 'human',
          content: inputContent,
          additionalKwargs: {
            timestamp: new Date().toISOString(),
          },
        },
        {
          type: 'ai',
          content: outputContent,
          additionalKwargs: {
            timestamp: new Date().toISOString(),
          },
        }
      );

      // Trim to window size if needed
      if (this.messages.length > this.windowSize * 2) {
        this.messages = this.messages.slice(-this.windowSize * 2);
      }

      log('Saved context to memory, current message count: %d', this.messages.length);
    } catch (err) {
      error('Failed to save context: %s', err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  clear(): void {
    this.messages = [];
    log('Cleared memory');
  }
}