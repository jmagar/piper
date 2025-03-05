#!/usr/bin/env node

import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (ES modules equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Get the OpenAI API key
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('Error: OPENAI_API_KEY environment variable not found');
  process.exit(1);
}

// Initialize OpenAI client
const openaiClient = new OpenAI({ apiKey: openaiApiKey });

// Test function
async function testOpenAIEmbedding() {
  try {
    console.log('Testing OpenAI text-embedding-3-large model...');
    
    // Sample content
    const content = 'This is a test for OpenAI\'s text-embedding-3-large model.';
    console.log(`Generating embedding for: "${content}"`);
    
    // Get current time for performance measurement
    const startTime = performance.now();
    
    // Generate embedding
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-large',
      input: content,
      encoding_format: 'float'
    });
    
    // Calculate time
    const endTime = performance.now();
    const timeTaken = (endTime - startTime) / 1000; // Convert to seconds
    
    console.log('Embedding generated successfully!');
    console.log(`Vector size: ${response.data[0].embedding.length}`);
    console.log(`First 5 values: ${response.data[0].embedding.slice(0, 5).join(', ')}`);
    console.log(`Time taken: ${timeTaken.toFixed(2)} seconds`);
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testOpenAIEmbedding();
