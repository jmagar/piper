
import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel, BindToolsInput } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import debug from 'debug';

const log = debug('mcp:model');
const error = debug('mcp:model:error');

interface ChatModelConfig {
  modelProvider: string;
  model?: string;
  temperature?: number;
  maxTokens?: number,
  tools?: BindToolsInput[];
}

export function initChatModel(config: ChatModelConfig): BaseChatModel {
  let model: BaseChatModel;

  const { modelProvider, tools, ...llmConfig } = config;
  log('Initializing chat model: %s', modelProvider);

  try {
    switch (modelProvider.toLowerCase()) {
      case 'openai':
        log('Creating OpenAI chat model with config: %o', llmConfig);
        model = new ChatOpenAI(llmConfig);
        break;

      case 'anthropic':
        log('Creating Anthropic chat model with config: %o', llmConfig);
        model = new ChatAnthropic(llmConfig);
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
        // FIXME: Need proper typing for bindTools and its return value
        model = (model as { bindTools: Function }).bindTools(tools);
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