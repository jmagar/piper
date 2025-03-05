#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (ES modules equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { embeddingGenerator } from './dist/embedding-generator.js';
import logger from './dist/utils/logger.js';

// Test local embedding generation
async function testLocalEmbeddings() {
  try {
    logger.info('Starting test of local embedding model');
    
    // Initialize the embedding generator
    await embeddingGenerator.initialize();
    
    // Process files
    logger.info('Processing files using local model...');
    await embeddingGenerator.processAllFiles();
    
    logger.success('Test completed successfully');
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testLocalEmbeddings();
