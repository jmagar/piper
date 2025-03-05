#!/usr/bin/env node

async function testLocalModel() {
  try {
    console.log('Testing local embedding model...');
    
    // Import the pipeline directly
    const { pipeline } = await import('@xenova/transformers');
    const model = 'Xenova/e5-large-v2';
    
    console.log(`Loading model: ${model}`);
    const embeddingPipeline = await pipeline('feature-extraction', model);
    
    // Create a simple embedding
    const text = 'This is a test for embedding generation.';
    console.log(`Generating embedding for: "${text}"`);
    
    const output = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
    
    console.log('Embedding generated successfully!');
    console.log(`Embedding size: ${output.data.length}`);
    console.log(`First 5 values: ${Array.from(output.data).slice(0, 5).join(', ')}`);
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testLocalModel();
