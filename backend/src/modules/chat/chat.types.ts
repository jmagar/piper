import type { Request } from 'express';
import type { BaseMessage } from '@langchain/core/messages';
import type { ToolUsage as DBToolUsage } from '../../types/db.js';

export interface ChatRequest extends Request {
    body: { 
        message: string;
        conversationId?: string;
        userId?: string;
    };
}

export type ToolUsage = DBToolUsage;

export interface AgentResult {
    messages: BaseMessage[];
} 