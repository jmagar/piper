import type { Request, Response } from 'express';
import { HumanMessage, BaseMessage } from '@langchain/core/messages';
import { broadcastLog } from '../utils/logger.js';
import { Agent } from '../types/index.js';

interface ChatRequest extends Request {
    body: { message: string };
}

export function createChatHandler(agent: Agent | undefined) {
    return async function handleChat(req: ChatRequest, res: Response): Promise<void> {
        try {
            broadcastLog('info', '=== New Chat Request ===');
            broadcastLog('info', 'Request headers: ' + JSON.stringify(req.headers));
            broadcastLog('info', 'Request body: ' + JSON.stringify(req.body));
            
            const { message } = req.body;
            broadcastLog('info', 'Received message: ' + message);
            
            if (!message || typeof message !== 'string') {
                broadcastLog('error', 'Invalid message format: ' + JSON.stringify(message));
                res.status(400).json({ 
                    error: 'Message is required and must be a string',
                    received: message 
                });
                return;
            }

            if (!agent) {
                broadcastLog('error', 'Agent not initialized');
                res.status(503).json({ 
                    error: 'Chat service not available - agent not initialized'
                });
                return;
            }

            broadcastLog('info', 'Creating message array...');
            const messages: BaseMessage[] = [new HumanMessage(message)];
            
            broadcastLog('info', 'Invoking agent with message...');
            broadcastLog('info', 'Thread ID: chat-thread');
            const result = await agent.invoke(
                { messages },
                { configurable: { thread_id: 'chat-thread' } }
            );
            broadcastLog('info', 'Agent invocation completed');
            
            broadcastLog('info', '=== Processing Agent Response ===');
            broadcastLog('info', 'Number of messages in result: ' + result.messages.length);

            // Process all messages to track tool usage
            let currentToolUsage: { tool?: string; input?: string; observation?: string } = {};
            let finalResponse = '';

            // Process messages in order to track tool usage
            for (const msg of result.messages) {
                if (!('content' in msg) || typeof msg.content !== 'string') continue;
                
                const content = msg.content.trim();
                
                if (content.includes('Action:') && content.includes('Action Input:')) {
                    // This is a tool action message
                    const actionMatch = content.match(/Action: (\w+)/);
                    const actionInputMatch = content.match(/Action Input: (.*?)(?=\n|$)/s);
                    
                    if (actionMatch) {
                        currentToolUsage = {
                            tool: actionMatch[1],
                            input: actionInputMatch ? actionInputMatch[1].trim() : '',
                        };
                    }
                } else if (content.includes('Observation:')) {
                    // This is a tool observation
                    const observationMatch = content.match(/Observation: (.*?)(?=\n|$)/s);
                    if (observationMatch && currentToolUsage.tool) {
                        currentToolUsage.observation = observationMatch[1].trim();
                        
                        // Format the tool usage
                        finalResponse += 'Action: Using ' + currentToolUsage.tool + '\n' +
                                       'Parameters: ' + currentToolUsage.input + '\n' +
                                       'Result: ' + currentToolUsage.observation + '\n\n';
                        
                        // Reset for next tool usage
                        currentToolUsage = {};
                    }
                } else if (msg === result.messages[result.messages.length - 1]) {
                    // This is the final response
                    finalResponse += content;
                }
            }

            let response = finalResponse || result.messages[result.messages.length - 1]?.content || 'I apologize, but I was unable to generate a proper response.';
            
            broadcastLog('info', 'Successfully extracted response content');
            
            if (!response) {
                broadcastLog('info', 'No valid response found, using fallback message');
                response = 'I apologize, but I was unable to generate a proper response.';
            }

            broadcastLog('info', '=== Sending Response ===');
            broadcastLog('info', 'Response length: ' + response.length);
            broadcastLog('info', 'Final response: ' + response);
            res.setHeader('Content-Type', 'text/plain');
            res.send(response);
            broadcastLog('info', 'Response sent successfully');
        } catch (error) {
            broadcastLog('info', '=== Error in Chat Handler ===');
            broadcastLog('error', 'Error details: ' + error);
            res.status(500).send('Internal server error');
        }
    };
} 