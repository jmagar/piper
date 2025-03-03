import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel, BindToolsInput } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import createLogger from './utils/debug';

const { log, error } = createLogger('mcp:model');

interface ChatModelConfig {
  modelProvider: string;
  model?: string;
  temperature?: number;
  maxTokens?: number,
  tools?: BindToolsInput[];
  streaming?: boolean;
}

export function initChatModel(config: ChatModelConfig): BaseChatModel {
  let model: BaseChatModel;

  const { modelProvider, tools, ...llmConfig } = config;
  log('Initializing chat model: %s', modelProvider);

  try {
    // Ensure streaming is set to true for streaming capabilities
    const modelConfig = {
      ...llmConfig,
      streaming: config.streaming ?? true // Default to true to enable streaming
    };

    switch (modelProvider.toLowerCase()) {
      case 'openai':
        log('Creating OpenAI chat model with config: %o', modelConfig);
        model = new ChatOpenAI(modelConfig);
        break;

      case 'anthropic':
        log('Creating Anthropic chat model with config: %o', modelConfig);
        model = new ChatAnthropic(modelConfig);
        break;

      default:
        error('Unsupported model provider: %s', modelProvider);
        throw new Error(
          `Unsupported model_provider: ${modelProvider}`,
        );
    }

    if (typeof model?.bindTools === 'function') {
      if (tools && tools.length > 0) {
        log('Binding %d tools to model', tools.length);
        // First cast to unknown, then to the appropriate type
        // This avoids the TypeScript error about incompatible types
        const modelWithTools = model as unknown;
        // Use a more generalized type that matches the actual bindTools method
        model = (modelWithTools as {
          bindTools: (tools: BindToolsInput[], kwargs?: Record<string, unknown>) => BaseChatModel
        }).bindTools(tools);
      }
    } else {
      error('Tool calling unsupported by model provider: %s', modelProvider);
      throw new Error(
        `Tool calling unsupported by model_provider: ${modelProvider}`,
      );
    }

    log('Successfully initialized chat model');
    return model;
  } catch (err) {
    error('Failed to initialize chat model: %s', err instanceof Error ? err.message : String(err));
    throw new Error(`Failed to initialize chat model: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}