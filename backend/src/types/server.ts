import { StructuredTool } from '@langchain/core/tools';
import { Agent, Config, TerminalServer } from './index.js';

export type { Config };

export interface ServerInitResult {
    config: Config;
    tools: StructuredTool[];
    agent: Agent | undefined;
    cleanup: () => Promise<void>;
    terminalServer: TerminalServer;
} 