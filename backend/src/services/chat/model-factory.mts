import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import type { Tool } from '@langchain/core/tools';
import debug from 'debug';

import type {
  ChatModelConfig,
  ChatModelInstance,
  SupportedModelProvider
} from '../../types/chat-model.js';
import { ChatModelError, ToolBindingError } from '../../types/chat-model.js';
import { ChatMemory } from './memory.mjs';

const log = debug('mcp:model:factory');
const error = debug('mcp:model:factory:error');

interface ModelFactoryOptions {
  memory?: boolean;
  streaming?: boolean;
  fallbackProvider?: SupportedModelProvider;
  memoryOptions?: {
    windowSize?: number;
    returnMessages?: boolean;
  };
}

export class ModelFactory {
  private static validateConfig(config: ChatModelConfig): void {
    if (!config.model) {
      throw new Error('Model name is required');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 1)) {
      throw new Error('Temperature must be between 0 and 1');
    }

    if (config.maxTokens !== undefined && config.maxTokens <= 0) {
      throw new Error('Max tokens must be greater than 0');
    }
  }

  private static async createOpenAIModel(
    config: ChatModelConfig,
    options: ModelFactoryOptions
  ): Promise<ChatModelInstance> {
    try {
      log('Creating OpenAI chat model with config: %o', config);
      const modelConfig = {
        modelName: config.model,
        temperature: config.temperature ?? 0.7,
        streaming: options.streaming ?? false,
        ...(config.maxTokens && { maxTokens: config.maxTokens }),
        ...(options.memory && {
          memory: new ChatMemory(options.memoryOptions)
        })
      } as const;

      const model = new ChatOpenAI(modelConfig);
      return model as unknown as ChatModelInstance;
    } catch (err) {
      error('Failed to create OpenAI model: %s', err instanceof Error ? err.message : String(err));
      throw new ChatModelError(
        'Failed to initialize OpenAI model',
        err instanceof Error ? err : undefined,
        'openai'
      );
    }
  }

  private static async createAnthropicModel(
    config: ChatModelConfig,
    options: ModelFactoryOptions
  ): Promise<ChatModelInstance> {
    try {
      log('Creating Anthropic chat model with config: %o', config);
      const modelConfig = {
        modelName: config.model,
        temperature: config.temperature ?? 0.7,
        streaming: options.streaming ?? false,
        ...(config.maxTokens && { maxTokens: config.maxTokens }),
        ...(options.memory && {
          memory: new ChatMemory(options.memoryOptions)
        })
      } as const;

      const model = new ChatAnthropic(modelConfig);
      return model as unknown as ChatModelInstance;
    } catch (err) {
      error('Failed to create Anthropic model: %s', err instanceof Error ? err.message : String(err));
      throw new ChatModelError(
        'Failed to initialize Anthropic model',
        err instanceof Error ? err : undefined,
        'anthropic'
      );
    }
  }

  private static async bindTools(
    model: ChatModelInstance,
    tools: Tool[],
    provider: SupportedModelProvider
  ): Promise<ChatModelInstance> {
    try {
      if (typeof model.bindTools !== 'function') {
        throw new Error('Model does not support tool binding');
      }

      log('Binding %d tools to %s model', tools.length, provider);
      return model.bindTools(tools);
    } catch (err) {
      error('Failed to bind tools to %s model: %s', provider, err instanceof Error ? err.message : String(err));
      throw new ToolBindingError(
        'Failed to bind tools to model',
        err instanceof Error ? err : undefined,
        provider,
        tools
      );
    }
  }

  static async create(
    config: ChatModelConfig,
    options: ModelFactoryOptions = {}
  ): Promise<ChatModelInstance> {
    this.validateConfig(config);

    const createModel = async (provider: SupportedModelProvider): Promise<ChatModelInstance> => {
      let model: ChatModelInstance;

      switch (provider) {
        case 'openai':
          model = await this.createOpenAIModel(config, options);
          break;
        case 'anthropic':
          model = await this.createAnthropicModel(config, options);
          break;
        default:
          throw new ChatModelError(
            `Unsupported model provider: ${provider}`,
            undefined,
            provider
          );
      }

      if (config.tools?.length) {
        model = await this.bindTools(model, config.tools, provider);
      }

      return model;
    };

    try {
      return await createModel(config.modelProvider);
    } catch (err) {
      if (options.fallbackProvider && options.fallbackProvider !== config.modelProvider) {
        log('Primary model failed, attempting fallback to %s', options.fallbackProvider);
        return createModel(options.fallbackProvider);
      }
      throw err;
    }
  }
}