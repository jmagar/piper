import { openai } from "@ai-sdk/openai"
import { generateText, generateObject, GenerateObjectResult } from "ai"
import { z } from "zod"

/**
 * Attempts to repair malformed or invalid JSON using AI
 * Based on AI SDK experimental_repairText functionality
 */
export async function repairInvalidJSON({
  text,
  error,
  schema
}: {
  text: string
  error: Error
  schema?: z.ZodSchema
}): Promise<string> {
  console.warn('[JSON Repair] Attempting to repair invalid JSON:', {
    errorType: error.constructor.name,
    errorMessage: error.message,
    textLength: text.length,
    textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
  })

  try {
    // Simple repairs first - these are fast and common
    const simpleRepaired = attemptSimpleRepairs(text)
    if (simpleRepaired !== text) {
      console.log('[JSON Repair] Applied simple repair')
      return simpleRepaired
    }

    // If simple repairs don't work, use AI to repair
    console.log('[JSON Repair] Attempting AI-powered repair')
    const schemaDescription = schema ? getSchemaDescription(schema) : ''
    
    const { text: repairedText } = await generateText({
      model: openai("gpt-4o-mini"), // Use fast model for repair
      prompt: `Fix this malformed JSON to make it valid and parseable:

Original error: ${error.message}

Malformed JSON:
\`\`\`json
${text}
\`\`\`

Instructions:
- Fix syntax errors (missing brackets, quotes, commas)
- Ensure valid JSON structure
- Preserve all original data and meaning
- Don't add new data, only fix formatting
- Return ONLY the fixed JSON, no explanations

${schemaDescription ? `The JSON should match this structure: ${schemaDescription}` : ''}`,
      temperature: 0.1, // Low temperature for precise repairs
      maxTokens: Math.max(text.length * 2, 1000), // Ensure enough tokens
    })

    console.log('[JSON Repair] AI repair completed')
    return repairedText.trim()
  } catch (repairError) {
    console.error('[JSON Repair] Repair failed:', repairError)
    // Return original text if repair fails
    return text
  }
}

/**
 * Get a simple description of a Zod schema for repair prompts
 */
function getSchemaDescription(schema: z.ZodSchema): string {
  try {
    // For simple schemas, we can provide a basic description
    const sampleObject = schema.safeParse({})
    if (sampleObject.success) {
      return JSON.stringify(sampleObject.data, null, 2)
    }
    
    // Fallback to basic description
    return 'Valid JSON object structure'
  } catch {
    return 'Valid JSON object structure'
  }
}

/**
 * Attempts common JSON repair patterns without AI
 */
function attemptSimpleRepairs(text: string): string {
  let repaired = text.trim()

  // Remove common prefixes/suffixes that LLMs sometimes add
  repaired = repaired.replace(/^```json\s*/, '')
  repaired = repaired.replace(/\s*```$/, '')
  repaired = repaired.replace(/^```\s*/, '')
  
  // Fix incomplete JSON objects
  if (repaired.startsWith('{') && !repaired.endsWith('}')) {
    // Count open/close braces to determine how many to add
    const openBraces = (repaired.match(/\{/g) || []).length
    const closeBraces = (repaired.match(/\}/g) || []).length
    const missingBraces = openBraces - closeBraces
    
    if (missingBraces > 0) {
      repaired += '}'.repeat(missingBraces)
    }
  }
  
  // Fix incomplete JSON arrays
  if (repaired.startsWith('[') && !repaired.endsWith(']')) {
    const openBrackets = (repaired.match(/\[/g) || []).length
    const closeBrackets = (repaired.match(/\]/g) || []).length
    const missingBrackets = openBrackets - closeBrackets
    
    if (missingBrackets > 0) {
      repaired += ']'.repeat(missingBrackets)
    }
  }

  // Fix trailing commas
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
  
  // Fix missing quotes around keys (basic pattern)
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
  
  return repaired
}

/**
 * Enhanced generateObject wrapper with JSON repair functionality
 */
export async function generateObjectWithRepair<T>(params: {
  model: ReturnType<typeof openai>
  schema: z.ZodSchema<T>
  prompt: string
  system?: string
  temperature?: number
  maxRetries?: number
}): Promise<GenerateObjectResult<T>> {
  const { maxRetries = 2, ...generateParams } = params
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Use experimental_repairText if available (AI SDK v5+)
      const result = await generateObject({
        ...generateParams,
        experimental_repairText: async ({ text, error }) => {
          return await repairInvalidJSON({
            text,
            error,
            schema: params.schema
          })
        }
      })
      
      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorName = error instanceof Error ? error.constructor.name : 'UnknownError'
      
      console.error(`[generateObjectWithRepair] Attempt ${attempt + 1} failed:`, {
        errorType: errorName,
        errorMessage,
        attempt: attempt + 1,
        maxRetries: maxRetries + 1
      })
      
      // If this is the last attempt or not a JSON error, throw
      if (attempt >= maxRetries || !isJSONError(error)) {
        throw error
      }
      
      // Add exponential backoff for retries
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s...
        console.log(`[generateObjectWithRepair] Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw new Error('All repair attempts failed')
}

/**
 * Check if error is related to JSON parsing/validation
 */
function isJSONError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  
  const errorMessage = error.message?.toLowerCase() || ''
  const errorName = error.constructor?.name?.toLowerCase() || ''
  
  return (
    errorMessage.includes('json') ||
    errorMessage.includes('parse') ||
    errorMessage.includes('syntax') ||
    errorMessage.includes('unexpected') ||
    errorName.includes('json') ||
    errorName.includes('parse') ||
    errorName.includes('syntax')
  )
} 