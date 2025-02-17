import type { Response } from 'express';
import { broadcastLog } from '../../utils/logger.js';
import { ChatService } from './chat.service.js';
import type { ChatRequest } from './chat.types.js';

export function createChatController(chatService: ChatService) {
    return async function handleChat(req: ChatRequest, res: Response): Promise<void> {
        try {
            broadcastLog('info', '=== New Chat Request ===');
            broadcastLog('info', 'Request headers: ' + JSON.stringify(req.headers));
            broadcastLog('info', 'Request body: ' + JSON.stringify(req.body));
            
            const { message, conversationId, userId } = req.body;

            // Input validation
            if (!message || typeof message !== 'string') {
                broadcastLog('error', 'Invalid message format: ' + JSON.stringify(message));
                res.status(400).json({ 
                    error: 'Message is required and must be a string',
                    received: message 
                });
                return;
            }

            const response = await chatService.processMessage(message, conversationId, userId);

            broadcastLog('info', '=== Sending Response ===');
            broadcastLog('info', 'Response length: ' + response.length);
            res.setHeader('Content-Type', 'text/plain');
            res.send(response);
            broadcastLog('info', 'Response sent successfully');

        } catch (error) {
            broadcastLog('error', '=== Error in Chat Controller ===');
            broadcastLog('error', 'Error details: ' + error);
            res.status(500).send('Internal server error');
        }
    };
} 