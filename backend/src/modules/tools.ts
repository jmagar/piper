import type { Request, Response } from 'express';
import { StructuredTool } from '@langchain/core/tools';
import { broadcastLog } from '../utils/logger.js';

export function createToolsHandler(tools: StructuredTool[]) {
    return function handleToolsInfo(_req: Request, res: Response): void {
        broadcastLog('info', 'Tools info requested');
        const toolsInfo = tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            requiredParameters: 'required' in tool.schema ? Object.keys(tool.schema.required) : [],
            schema: tool.schema
        }));
        res.json(toolsInfo);
    };
} 