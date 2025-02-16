import type { Request, Response } from 'express';
import { broadcastLog } from '../utils/logger.js';
import { Config } from '../types/index.js';

export function createConfigHandler(config: Config) {
    return function handleMcpConfig(_req: Request, res: Response): void {
        broadcastLog('info', 'MCP config requested');
        res.json({
            llm: {
                model_provider: config.llm.model_provider,
                model: config.llm.model,
                temperature: config.llm.temperature,
                max_tokens: config.llm.max_tokens
            }
        });
    };
} 