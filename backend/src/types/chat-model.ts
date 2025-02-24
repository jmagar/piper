import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ChatMessage, FunctionMessage, SystemMessage } from '@langchain/core/messages';
import type { Tool } from '@langchain/core/tools';

export type SupportedModelProvider = 'openai' | 'anthropic';

export interface ChatModelConfig {
  modelProvider: SupportedModelProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
}

export interface ChatModelResponse {
  content: string;
  messages: (ChatMessage | SystemMessage | FunctionMessage)[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatModelInstance extends BaseChatModel {
  bindTools?: (tools: Tool[]) => ChatModelInstance;
}

export class ChatModelError extends Error {
  override name = 'ChatModelError';

  constructor(
    message: string,
    public override readonly cause: Error | undefined,
    public readonly provider: SupportedModelProvider
  ) {
    super(message);
    Error.captureStackTrace(this, ChatModelError);
  }
}

export class ToolBindingError extends Error {
  override name = 'ToolBindingError';

  constructor(
    message: string,
    public override readonly cause: Error | undefined,
    public readonly provider: SupportedModelProvider,
    public readonly tools: Tool[]
  ) {
    super(message);
    Error.captureStackTrace(this, ToolBindingError);
  }
}