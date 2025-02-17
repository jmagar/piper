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

export interface ToolParameter {
    type: string;
    description: string;
    required: boolean;
}

export interface ToolSchema {
    type: 'object';
    properties: {
        [key: string]: ToolParameter;
    };
    required: string[];
}

export interface Tool {
    name: string;
    description: string;
    parameters: ToolSchema;
}

export interface ServerStatus {
    status: 'ready' | 'starting' | 'stopping' | 'error';
    protocol_version: string;
    version: string;
    features: string[];
    error?: string;
    tools: Tool[];
    capabilities?: {
        prompts?: boolean;
        resources?: boolean;
        tools?: boolean;
        sampling?: boolean;
    };
}

export interface ServerInfo {
    name: string;
    command: string;
    args: string[];
    status: ServerStatus['status'];
    error?: string;
    lastChecked: string;
    toolCount: number;
    env: string[];
    tools: Tool[];
    features: string[];
    version: string;
    protocol_version: string;
    capabilities?: ServerStatus['capabilities'];
}

export interface ServerSummary {
    total: number;
    ready: number;
    starting: number;
    stopping: number;
    error: number;
} 