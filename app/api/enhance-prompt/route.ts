import { NextRequest, NextResponse } from "next/server"
import { appLogger } from "@/lib/logger"
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

const ENHANCEMENT_TEMPLATE = `You are a prompt enhancement assistant. Your job is to improve user prompts to make them clearer, more specific, and more effective for AI assistants.

Rules for enhancement:
1. Preserve the original intent and meaning
2. Add clarity and specificity where needed
3. Include relevant context that would help Piper understand better
4. Make the prompt more actionable and clear
5. Don't change the fundamental request, just improve it
6. Keep the enhanced prompt concise but comprehensive
7. If the original prompt is already excellent, make minimal changes

Original prompt: {userInput}

Enhanced prompt:`

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()
    
    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    // Initialize OpenRouter provider (same as main chat system)
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    })

    const enhancementPrompt = ENHANCEMENT_TEMPLATE.replace('{userInput}', prompt)

    const response = await generateText({
      model: openrouter.chat('openai/gpt-4o-mini'), // Fast and cost-effective for prompt enhancement via OpenRouter
      prompt: enhancementPrompt,
      maxTokens: 500,
      temperature: 0.3, // Lower temperature for more consistent enhancement
    })

    const enhancedPrompt = response.text?.trim()

    if (!enhancedPrompt) {
      appLogger.error("[Enhance Prompt] No enhanced prompt received from OpenRouter")
      return NextResponse.json(
        { error: "Failed to enhance prompt" },
        { status: 500 }
      )
    }

    appLogger.info(`[Enhance Prompt] Successfully enhanced prompt from ${prompt.length} to ${enhancedPrompt.length} characters`)

    return NextResponse.json({
      enhancedPrompt,
      originalPrompt: prompt
    })

  } catch (error) {
    appLogger.error("[Enhance Prompt] Error enhancing prompt:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 