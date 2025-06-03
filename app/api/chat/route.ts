import 'dotenv/config'; // Ensure .env variables are loaded using ES module syntax

import { loadAgent } from "@/lib/agents/load-agent"
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { loadMCPToolsFromURL } from "@/lib/mcp/load-mcp-from-url";
import { getCombinedMCPToolsForAISDK, getManagedServersInfo } from "@/lib/mcp/mcpManager";
import { reportMCPError } from "@/lib/mcp/enhanced-integration";
// import { MODELS } from "@/lib/models" // Removed unused import
import { Attachment } from "@ai-sdk/ui-utils"
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  Message as MessageAISDK,
  streamText,
  ToolSet,
} from "ai"
import { prisma } from "@/lib/prisma"; 
import {
  logUserMessage,
  validateAndTrackUsage,
  trackSpecialAgentUsage,
} from "./api"
import { saveFinalAssistantMessage } from "./db"
import { parseToolMentions, stripToolMentions, parseRuleMentions, stripRuleMentions } from "@/app/types/tool-mention"

// Import our logging system
import { aiSdkLogger, AiProvider, AiSdkOperation, StreamingState } from '@/lib/logger/ai-sdk-logger'
import { appLogger } from '@/lib/logger'
import { getCurrentCorrelationId } from '@/lib/logger/correlation'

export const maxDuration = 60

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  model: string
  systemPrompt: string
  agentId?: string
}

// Helper function to process tool mentions and execute tools
async function processToolMentions(messages: MessageAISDK[]): Promise<MessageAISDK[]> {
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user' || typeof lastMessage.content !== 'string') {
    return messages
  }

  const toolMentions = parseToolMentions(lastMessage.content)
  if (toolMentions.length === 0) {
    return messages
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Chat API] Found ${toolMentions.length} tool mentions to process`)
  }

  // Get available MCP tools to find full tool IDs
  const serversInfo = await getManagedServersInfo()
  const availableTools = serversInfo
    .filter(server => server.status === 'success')
    .flatMap(server => 
      server.tools.map(tool => ({
        name: tool.name,
        serverId: server.key,
        serverLabel: server.label,
        fullId: `${server.key}_${tool.name}`
      }))
    )

  // Get combined tools for execution
  const combinedTools = await getCombinedMCPToolsForAISDK()

  const processedMessages = [...messages]
  const toolResults: MessageAISDK[] = []

  // Process each tool mention
  for (const mention of toolMentions) {
    console.log(`[Chat API] Processing tool mention: ${mention.toolName}`)
    const matchingTool = availableTools.find(tool => tool.name === mention.toolName)
    if (!matchingTool) {
      console.warn(`[Chat API] Tool not found: ${mention.toolName}`)
      console.log(`[Chat API] Available tools:`, availableTools.map(t => t.name))
      continue
    }

    console.log(`[Chat API] Found matching tool: ${matchingTool.fullId}`)
    const toolFunction = combinedTools[matchingTool.fullId]
    if (!toolFunction) {
      console.warn(`[Chat API] Tool function not available: ${matchingTool.fullId}`)
      console.log(`[Chat API] Available combined tools:`, Object.keys(combinedTools))
      continue
    }

    try {
      console.log(`[Chat API] Executing tool: ${matchingTool.fullId} with params:`, mention.parameters)
      
      if (!toolFunction.execute) {
        throw new Error('Tool execute function is not available')
      }
      
      const result = await toolFunction.execute(mention.parameters, {
        toolCallId: `tool-call-${Date.now()}-${Math.random()}`,
        messages: []
      })
      
      // Add tool result as assistant message
      toolResults.push({
        id: `tool-result-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: `Tool ${mention.toolName} executed successfully:\n\n${JSON.stringify(result, null, 2)}`
      })
      
      console.log(`[Chat API] Tool ${matchingTool.fullId} executed successfully`)
    } catch (error) {
      console.error(`[Chat API] Error executing tool ${matchingTool.fullId}:`, error)
      
      // Enhanced error reporting with metrics
      if (error instanceof Error) {
        await reportMCPError(matchingTool.serverId, mention.toolName, error, {
          fullId: matchingTool.fullId,
          parameters: mention.parameters,
          correlationId: getCurrentCorrelationId()
        })
      }
      
      toolResults.push({
        id: `tool-error-${Date.now()}-${Math.random()}`,
        role: 'assistant', 
        content: `Tool ${mention.toolName} failed: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }

  // Update the last message to remove tool mentions
  const cleanedContent = stripToolMentions(lastMessage.content)
  if (cleanedContent) {
    processedMessages[processedMessages.length - 1] = {
      ...lastMessage,
      content: cleanedContent
    }
  } else {
    // If only tool mentions, replace with a generic message
    processedMessages[processedMessages.length - 1] = {
      ...lastMessage,
      content: 'I executed the requested tools.'
    }
  }

  // Add tool results before the final user message
  return [...processedMessages.slice(0, -1), ...toolResults, processedMessages[processedMessages.length - 1]]
}

// Helper function to process rule mentions and inject rule content
async function processRuleMentions(messages: MessageAISDK[], currentSystemPrompt: string): Promise<{ processedMessages: MessageAISDK[], enhancedSystemPrompt: string }> {
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user' || typeof lastMessage.content !== 'string') {
    return { processedMessages: messages, enhancedSystemPrompt: currentSystemPrompt }
  }

  const ruleMentions = parseRuleMentions(lastMessage.content)
  if (ruleMentions.length === 0) {
    return { processedMessages: messages, enhancedSystemPrompt: currentSystemPrompt }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Chat API] Found ${ruleMentions.length} rule mentions to process`)
  }

  // Fetch rules from database
  const ruleContents: string[] = []
  for (const mention of ruleMentions) {
    try {
      console.log(`[Chat API] Looking up rule: ${mention.ruleSlug}`)
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rule = await (prisma as any).rule.findUnique({
        where: { slug: mention.ruleSlug },
        select: {
          id: true,
          name: true,
          description: true,
          system_prompt: true
        }
      })

      if (rule) {
        console.log(`[Chat API] Found rule: ${rule.name}`)
        ruleContents.push(`\n--- Rule: ${rule.name} ---\n${rule.system_prompt}\n`)
      } else {
        console.warn(`[Chat API] Rule not found: ${mention.ruleSlug}`)
        ruleContents.push(`\n[Note: Rule @${mention.ruleSlug} was mentioned but not found]\n`)
      }
    } catch (error) {
      console.error(`[Chat API] Error fetching rule ${mention.ruleSlug}:`, error)
      ruleContents.push(`\n[Note: Error loading rule @${mention.ruleSlug}]\n`)
    }
  }

  // Enhance system prompt with rule content
  const enhancedSystemPrompt = ruleContents.length > 0 
    ? currentSystemPrompt + '\n\n--- Applied Rules ---' + ruleContents.join('')
    : currentSystemPrompt

  // Clean rule mentions from the last user message
  const processedMessages = [...messages]
  const cleanedContent = stripRuleMentions(lastMessage.content)
  
  if (cleanedContent.trim()) {
    processedMessages[processedMessages.length - 1] = {
      ...lastMessage,
      content: cleanedContent
    }
  } else {
    // If only rule mentions, replace with a generic message
    processedMessages[processedMessages.length - 1] = {
      ...lastMessage,
      content: 'I would like you to apply the mentioned rules to our conversation.'
    }
  }

  console.log(`[Chat API] Enhanced system prompt with ${ruleContents.length} rule(s)`)
  return { processedMessages, enhancedSystemPrompt }
}

// Helper function to prune messages for large conversations  
function pruneMessagesForPayloadSize(messages: MessageAISDK[], hasTools: boolean): MessageAISDK[] {
  // Conservative limits to prevent OpenRouter payload issues
  const MAX_MESSAGES_WITH_TOOLS = 12
  const MAX_MESSAGES_WITHOUT_TOOLS = 20

  const limit = hasTools ? MAX_MESSAGES_WITH_TOOLS : MAX_MESSAGES_WITHOUT_TOOLS
  
  if (messages.length <= limit) {
    return messages
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Chat API] Pruning messages: ${messages.length} → ${limit} (hasTools: ${hasTools})`)
  }

  // Keep system messages separate
  const systemMessages = messages.filter(m => m.role === 'system')
  const nonSystemMessages = messages.filter(m => m.role !== 'system')
  
  if (nonSystemMessages.length <= limit) {
    return messages
  }

  // Keep first exchange (important context) + recent messages
  const firstExchange = nonSystemMessages.slice(0, 2) // First user + assistant
  const recentMessages = nonSystemMessages.slice(-(limit - 2))
  
  const prunedMessages = [...systemMessages, ...firstExchange, ...recentMessages]
  
  appLogger.aiSdk.info(`Pruned conversation: ${messages.length} → ${prunedMessages.length} messages`, {
    correlationId: getCurrentCorrelationId(),
    hasTools,
    originalCount: messages.length,
    prunedCount: prunedMessages.length
  })
  
  return prunedMessages
}

// Helper function to select relevant tools for large conversations
function selectRelevantTools(allTools: ToolSet, messageCount: number): ToolSet {
  const toolEntries = Object.entries(allTools)
  
  // Conservative tool limits to prevent payload issues
  const MAX_TOOLS_LONG_CONVERSATION = 25
  const MAX_TOOLS_MEDIUM_CONVERSATION = 50
  
  if (messageCount <= 10) {
    return allTools // Short conversation: use all tools
  } else if (messageCount <= 15) {
    // Medium conversation: limit tools
    if (toolEntries.length <= MAX_TOOLS_MEDIUM_CONVERSATION) {
      return allTools
    }
    
    // Prioritize general tools over server-specific ones
    const prioritizedTools = toolEntries
      .sort(([keyA], [keyB]) => {
        // Prioritize tools without server prefixes (general tools)
        const isGeneralA = !keyA.includes('_')
        const isGeneralB = !keyB.includes('_')
        if (isGeneralA && !isGeneralB) return -1
        if (!isGeneralA && isGeneralB) return 1
        return 0
      })
      .slice(0, MAX_TOOLS_MEDIUM_CONVERSATION)
    
    return Object.fromEntries(prioritizedTools) as ToolSet
  } else {
    // Long conversation: minimal essential tools
    if (toolEntries.length <= MAX_TOOLS_LONG_CONVERSATION) {
      return allTools
    }
    
    // Select most essential tools (prioritize general + common MCP tools)
    const essentialTools = toolEntries
      .filter(([key]) => {
        // Prioritize core tools
        return key.includes('file') || 
               key.includes('search') || 
               key.includes('read') || 
               key.includes('edit') || 
               key.includes('codebase') ||
               !key.includes('_') // General tools without server prefix
      })
      .slice(0, MAX_TOOLS_LONG_CONVERSATION)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Chat API] Long conversation tool reduction: ${toolEntries.length} → ${essentialTools.length}`)
    }
    
    appLogger.aiSdk.info(`Reduced tools for long conversation`, {
      correlationId: getCurrentCorrelationId(),
      messageCount,
      originalToolCount: toolEntries.length,
      selectedToolCount: essentialTools.length
    })
    
    return Object.fromEntries(essentialTools) as ToolSet
  }
}

export async function POST(req: Request) {
  const correlationId = getCurrentCorrelationId();
  appLogger.http.info('Chat API request received', { correlationId });

  try {
    const requestBody = await req.json()
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Chat API] Messages: ${requestBody.messages?.length || 0}, Chat: ${requestBody.chatId}`)
      if (requestBody.messages?.length > 0) {
        const lastMessage = requestBody.messages[requestBody.messages.length - 1]
        if (lastMessage.experimental_attachments?.length > 0) {
          console.log(`[Chat API] ${lastMessage.experimental_attachments.length} attachments`)
        }
      }
    }
    
    const {
      messages,
      chatId,
      model,
      systemPrompt,
      agentId,
    } = requestBody as ChatRequest

    if (!messages || !chatId) {
      appLogger.http.warn('Chat API request missing required fields', { 
        correlationId,
        hasMessages: !!messages,
        hasChatId: !!chatId 
      });
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    // Log chat operation start
    appLogger.aiSdk.info('Starting chat completion', {
      correlationId,
      chatId,
      model: model || 'anthropic/claude-3.5-sonnet',
      messageCount: messages.length,
      hasAgent: !!agentId
    });

    // Ensure the Chat record exists for this chatId
    const firstUserMessageContent = messages.find(m => m.role === 'user')?.content || "New Chat";
    const defaultTitle = typeof firstUserMessageContent === 'string' 
      ? firstUserMessageContent.substring(0, 100) 
      : "New Chat";

    await prisma.chat.upsert({
      where: { id: chatId },
      update: { updatedAt: new Date() }, 
      create: {
        id: chatId,
        title: defaultTitle, 
        model: model,             
        systemPrompt: systemPrompt, 
        agentId: agentId,         
      },
    });
    appLogger.aiSdk.info(`✅ Ensured chat exists or created: ${chatId} with title "${defaultTitle}"`, { correlationId });

    // Validate request (simplified for admin-only mode)
    await validateAndTrackUsage()

    // Process tool mentions before continuing
    const processedMessagesAfterTools = await processToolMentions(messages)

    // Get initial system prompt
    let agentConfig = null
    if (agentId) {
      agentConfig = await loadAgent(agentId)
      appLogger.aiSdk.debug('Loaded agent configuration', { 
        correlationId, 
        agentId, 
        hasSystemPrompt: !!agentConfig?.systemPrompt 
      });
    }

    const initialSystemPrompt = agentConfig?.systemPrompt || systemPrompt || SYSTEM_PROMPT_DEFAULT

    // Process rule mentions and enhance system prompt
    const { processedMessages, enhancedSystemPrompt } = await processRuleMentions(processedMessagesAfterTools, initialSystemPrompt)

    // Convert relative attachment URLs to absolute URLs for AI model access
    const messagesWithAbsoluteUrls = processedMessages.map((message) => {
      // ✅ AI SDK PATTERN: Files are already handled by AI SDK, just pass through
      return message
    })

    const userMessage = messagesWithAbsoluteUrls[messagesWithAbsoluteUrls.length - 1]

    if (userMessage?.role === "user") {
      await logUserMessage({
        chatId,
        content: userMessage.content,
        attachments: userMessage.experimental_attachments as Attachment[],
      })
    }

    // Initialize OpenRouter provider
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY, // Reverted to use environment variable
    });

    const effectiveSystemPrompt = enhancedSystemPrompt

    let toolsToUse = undefined

    if (agentConfig?.mcpConfig) {
      const mcpConfig = agentConfig.mcpConfig as { server?: string }
      if (mcpConfig.server) {
        const { tools } = await loadMCPToolsFromURL(mcpConfig.server)
        toolsToUse = tools
      }
    } else if (agentConfig?.tools) {
      toolsToUse = agentConfig.tools
      await trackSpecialAgentUsage()
    } else {
      // If no agent-specific tools, use general MCP tools
      const generalMcpTools = await getCombinedMCPToolsForAISDK();
      if (Object.keys(generalMcpTools).length > 0) {
        toolsToUse = generalMcpTools;
      }
    }

    // Apply smart conversation orchestration to prevent payload size issues
    const messageCount = messagesWithAbsoluteUrls.length
    
    // Prune messages for large conversations to prevent OpenRouter payload errors
    const prunedMessages = pruneMessagesForPayloadSize(messagesWithAbsoluteUrls, !!toolsToUse)
    
    // Select relevant tools for large conversations
    if (toolsToUse && Object.keys(toolsToUse).length > 0) {
      toolsToUse = selectRelevantTools(toolsToUse, messageCount)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Chat API] Conversation orchestration: ${messageCount} messages → ${prunedMessages.length} messages, tools: ${toolsToUse ? Object.keys(toolsToUse).length : 0}`);
    }

    // Start AI SDK operation logging
    const operationId = aiSdkLogger.startOperation(
      AiProvider.OPENROUTER,
      model || 'anthropic/claude-3.5-sonnet',
      AiSdkOperation.STREAMING_START,
      {
        chatId,
        agentId,
        messageCount: messages.length,
        hasTools: !!toolsToUse,
        systemPromptLength: effectiveSystemPrompt.length
      }
    );

    let streamError: Error | null = null

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Chat API] Streaming with ${model}, tools: ${toolsToUse ? Object.keys(toolsToUse).length : 0}`);
    }
    
    // Build streamText configuration conditionally
    const streamConfig = {
      model: openrouter.chat(model || 'anthropic/claude-3.5-sonnet'),
      system: effectiveSystemPrompt,
      messages: prunedMessages,
      maxTokens: 8096,
    } as const;

    // Only add tools and maxSteps if tools are available
    const finalConfig = toolsToUse && Object.keys(toolsToUse).length > 0 
      ? { ...streamConfig, tools: toolsToUse, maxSteps: 10 }
      : streamConfig;

    const result = streamText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(finalConfig as any),
      onError: (event: { error: unknown }) => {
        appLogger.aiSdk.error("🛑 streamText error (raw event.error):", event.error as Error, { correlationId });

        // Attempt to get more details from event.error
        let errorMessage = "AI generation failed. Please check your model or API key.";
        if (event.error instanceof Error) {
          errorMessage = event.error.message;
          appLogger.aiSdk.error("🛑 streamText error (event.error.message):", new Error(event.error.message), { correlationId });
          if (event.error.stack) {
            appLogger.aiSdk.error("🛑 streamText error (event.error.stack):", new Error(event.error.stack), { correlationId });
          }
        } else if (typeof event.error === 'object' && event.error !== null) {
          appLogger.aiSdk.error("🛑 streamText error (event.error as stringified object):", new Error(JSON.stringify(event.error, null, 2)), { correlationId });
          // Try to find a message property, or just stringify
          const errorObj = event.error as Record<string, unknown>;
          errorMessage = (typeof errorObj.message === 'string' ? errorObj.message : JSON.stringify(event.error));
        } else if (event.error !== undefined && event.error !== null) {
          errorMessage = String(event.error);
          appLogger.aiSdk.error("🛑 streamText error (event.error as string):", new Error(errorMessage), { correlationId });
        }
        
        streamError = new Error(errorMessage);
        
        // Log streaming error with AI SDK logger
        aiSdkLogger.logStreamingEvent(operationId, StreamingState.ERROR, {
          error: streamError,
          chunkSize: 0
        });
      },

      onFinish: async ({ response }) => {
        try {
          // Extract token usage from response metadata
          const usage = (response as { usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }).usage || {};
          const tokenUsage = {
            promptTokens: usage.promptTokens || 0,
            completionTokens: usage.completionTokens || 0,
            totalTokens: usage.totalTokens || 0
          };

          appLogger.aiSdk.info('AI SDK completion finished', {
            correlationId,
            tokenUsage,
            responseMessageCount: response.messages.length
          });

          // End AI operation with token usage
          aiSdkLogger.endOperation(operationId, {
            tokenUsage,
            response: response.messages
          });

          // Save the complete assistant messages with parts preserved
          await saveFinalAssistantMessage(chatId, response.messages)
          
          appLogger.aiSdk.info('Assistant messages stored successfully with parts', { correlationId, chatId });
        } catch (error) {
          appLogger.aiSdk.error('Error in onFinish callback:', error as Error, { correlationId });
          // End operation with error
          aiSdkLogger.endOperation(operationId, {
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      },
    })

    // Log streaming start
    aiSdkLogger.logStreamingEvent(operationId, StreamingState.STARTED);

    // Note: Removed consumeStream() call to enable proper streaming
    // The stream will be consumed by the client as chunks arrive

    if (streamError) {
      appLogger.aiSdk.error('Stream error occurred during consumption', streamError, { correlationId });
      throw streamError
    }

    // Log streaming completion (will be called by onFinish callback)
    // aiSdkLogger.logStreamingEvent(operationId, StreamingState.COMPLETED, {
    //   totalChunks: chunkCount,
    //   chunkSize: totalStreamSize
    // });

    const originalResponse = result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error('[Chat API] Error in data stream:', error);
        return error instanceof Error ? error.message : String(error);
      }
    })
    
    // Optionally attach chatId in a custom header.
    const headers = new Headers(originalResponse.headers)
    headers.set("X-Chat-Id", chatId)
    headers.set("X-Correlation-Id", correlationId || '')

    appLogger.http.info('Chat API request completed successfully', { 
      correlationId, 
      chatId,
      status: originalResponse.status
    });

    return new Response(originalResponse.body, {
      status: originalResponse.status,
      headers,
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    
    appLogger.http.error("Error in /api/chat:", err as Error, { correlationId })
    appLogger.aiSdk.error("Chat completion failed:", err as Error, { correlationId })
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId || ''
        }
      }
    )
  }
}
