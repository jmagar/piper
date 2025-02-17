export interface ServerStatus {
    status: 'ready' | 'starting' | 'stopping' | 'error';
    error?: string;
    version: string;
    protocol_version: string;
    features: string[];
    tools: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: Record<string, unknown>;
            required: string[];
        };
    }[];
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
    tools: ServerStatus['tools'];
    features: string[];
    version: string;
    protocol_version: string;
}

export interface ServerSummary {
    total: number;
    ready: number;
    starting: number;
    stopping: number;
    error: number;
} 