/**
 * JSON Repair Functionality Demo
 * 
 * This file demonstrates the implementation of AI SDK's experimental_repairText
 * functionality for handling malformed JSON responses from language models.
 * 
 * Based on: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data#repairing-invalid-or-malformed-json
 */

import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { generateObjectWithRepair, repairInvalidJSON } from "./json-repair"

// Example schemas for testing
const personSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
  hobbies: z.array(z.string())
})

const recipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.object({
    name: z.string(),
    amount: z.string()
  })),
  steps: z.array(z.string()),
  cookingTime: z.number()
})

/**
 * Demo: Basic usage with repair functionality
 */
export async function demoBasicRepair() {
  console.log("=== JSON Repair Demo: Basic Usage ===")
  
  try {
    const result = await generateObjectWithRepair({
      model: openai("gpt-4o-mini"),
      schema: personSchema,
      prompt: "Generate a fictional person's profile with realistic details",
      maxRetries: 2
    })
    
    console.log("✅ Generated person:", result.object)
    return result.object
  } catch (error) {
    console.error("❌ Failed even with repair:", error)
    throw error
  }
}

/**
 * Demo: Complex schema with higher chance of malformed JSON
 */
export async function demoComplexRepair() {
  console.log("=== JSON Repair Demo: Complex Schema ===")
  
  try {
    const result = await generateObjectWithRepair({
      model: openai("gpt-4o-mini"),
      schema: recipeSchema,
      prompt: "Create a detailed recipe for chocolate chip cookies with exact measurements and step-by-step instructions",
      maxRetries: 3, // More retries for complex data
      temperature: 0.7 // Higher temperature increases chance of errors
    })
    
    console.log("✅ Generated recipe:", JSON.stringify(result.object, null, 2))
    return result.object
  } catch (error) {
    console.error("❌ Failed even with repair:", error)
    throw error
  }
}

/**
 * Demo: Manual JSON repair for testing
 */
export async function demoManualRepair() {
  console.log("=== JSON Repair Demo: Manual Repair ===")
  
  // Simulate common malformed JSON patterns
  const malformedExamples = [
    // Missing closing brace
    '{ "name": "John", "age": 30',
    
    // Trailing comma
    '{ "name": "John", "age": 30, }',
    
    // Code block wrapper
    '```json\n{ "name": "John", "age": 30 }\n```',
    
    // Unquoted keys
    '{ name: "John", age: 30 }',
    
    // Missing quotes
    '{ "name": John, "age": 30 }'
  ]
  
  for (let i = 0; i < malformedExamples.length; i++) {
    const malformed = malformedExamples[i]
    console.log(`\n--- Example ${i + 1}: Malformed JSON ---`)
    console.log("Original:", malformed)
    
    try {
      const repaired = await repairInvalidJSON({
        text: malformed,
        error: new Error("JSON parsing failed"),
        schema: personSchema
      })
      
      console.log("Repaired:", repaired)
      
      // Test if repaired JSON is valid
      const parsed = JSON.parse(repaired)
      console.log("✅ Valid JSON:", parsed)
    } catch (error) {
      console.error("❌ Repair failed:", error)
    }
  }
}

/**
 * Demo: Error handling and fallbacks
 */
export async function demoErrorHandling() {
  console.log("=== JSON Repair Demo: Error Handling ===")
  
  try {
    // Intentionally problematic prompt that might cause JSON issues
    const result = await generateObjectWithRepair({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        complexData: z.object({
          nested: z.object({
            deeplyNested: z.array(z.object({
              id: z.string(),
              values: z.array(z.number())
            }))
          })
        })
      }),
      prompt: "Generate extremely complex nested data with lots of arrays and objects, make it as complicated as possible",
      maxRetries: 1, // Limited retries to test error handling
      temperature: 1.0 // High temperature to increase error likelihood
    })
    
    console.log("✅ Surprisingly successful:", result.object)
    return result.object
  } catch (error) {
    console.log("❌ Expected failure for demo purposes:", error instanceof Error ? error.message : error)
    
    // Demonstrate graceful fallback
    console.log("🔄 Implementing graceful fallback...")
    return {
      complexData: {
        nested: {
          deeplyNested: [
            { id: "fallback-1", values: [1, 2, 3] }
          ]
        }
      }
    }
  }
}

/**
 * Run all demos
 */
export async function runAllRepairDemos() {
  console.log("🚀 Starting JSON Repair Functionality Demos\n")
  
  try {
    await demoBasicRepair()
    console.log("\n" + "=".repeat(50) + "\n")
    
    await demoComplexRepair() 
    console.log("\n" + "=".repeat(50) + "\n")
    
    await demoManualRepair()
    console.log("\n" + "=".repeat(50) + "\n")
    
    await demoErrorHandling()
    
    console.log("\n✅ All JSON repair demos completed!")
  } catch (error) {
    console.error("\n❌ Demo suite failed:", error)
  }
}

// Export for use in other files
export {
  personSchema,
  recipeSchema
} 