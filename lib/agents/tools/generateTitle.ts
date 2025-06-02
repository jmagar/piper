import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { generateObjectWithRepair } from "./json-repair"

const titleSchema = z.object({ title: z.string() })

export async function generateTitle(prompt: string): Promise<string> {
  try {
    const { object: titleObj } = await generateObjectWithRepair({
      model: openai("gpt-4o-mini", { structuredOutputs: true }),
      schema: titleSchema,
      prompt: `Write a short report title (max 12 words) for:
        "${prompt}". Only capitalize the first word; no trailing punctuation; avoid the word "report".`,
      maxRetries: 2, // Allow up to 2 repair attempts
      temperature: 0.3 // Slightly higher for creativity
    })

    return titleObj.title
  } catch (error) {
    console.error("Failed to generate title even with repair:", error)
    
    // Fallback to a simple title if all repair attempts fail
    const fallbackTitle = prompt.length > 50 
      ? prompt.substring(0, 50).trim() + "..." 
      : prompt
    
    return fallbackTitle || "Generated Report"
  }
}
