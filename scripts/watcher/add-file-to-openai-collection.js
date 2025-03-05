#!/usr/bin/env node

import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get current file directory (ES modules equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configuration
const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6550';
const qdrantApiKey = process.env.QDRANT_API_KEY || 'bktvginrwh7UPs9FPoZRxIORaRX5HCRl';
const baseCollection = process.env.QDRANT_COLLECTION || 'pooper-knowledge';
const openaiApiKey = process.env.OPENAI_API_KEY;
const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-large';

// Model specific collection to avoid dimension mismatch
const qdrantCollection = `${baseCollection}-openai3`;

// Initialize clients
const qdrantClient = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
});

const openaiClient = new OpenAI({ apiKey: openaiApiKey });

// Get file path from command line arguments
const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a file path to add to the collection.');
  console.error('Usage: node add-file-to-openai-collection.js <file-path>');
  process.exit(1);
}

async function countLines(content) {
  return content.split('\n').length;
}

async function generateEmbedding(text) {
  try {
    console.log(`Generating embedding for file content...`);
    const response = await openaiClient.embeddings.create({
      model: embeddingModel,
      input: text,
      encoding_format: 'float'
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

async function addFileToCollection(filePath) {
  try {
    console.log(`\n--- Adding File to OpenAI Embeddings Collection ---`);
    console.log(`File: ${filePath}`);
    console.log(`Collection: ${qdrantCollection}`);
    
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(coll => coll.name === qdrantCollection);
    
    if (!exists) {
      console.error(`Collection "${qdrantCollection}" does not exist. Please run create-openai-collection.js first.`);
      process.exit(1);
    }
    
    // Read the file
    console.log(`Reading file...`);
    const content = await fs.readFile(filePath, 'utf-8');
    const lineCount = await countLines(content);
    const fileExt = path.extname(filePath).slice(1);
    
    // Generate embedding
    const embedding = await generateEmbedding(content);
    
    // Use the file path as the ID hash
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`Relative path: ${relativePath}`);
    
    // Generate a UUID for the document
    const uuid = crypto.randomUUID();
    
    // Store in Qdrant
    console.log(`Storing in Qdrant...`);
    await qdrantClient.upsert(qdrantCollection, {
      points: [{
        id: uuid,
        vector: embedding,
        payload: {
          path: relativePath,
          content: content,
          extension: fileExt,
          lineCount: lineCount,
          lastUpdated: Date.now(),
        }
      }]
    });
    
    console.log(`\nFile successfully added to collection!`);
    console.log(`ID: ${uuid}`);
    console.log(`Path: ${relativePath}`);
    console.log(`Extension: ${fileExt}`);
    console.log(`Line count: ${lineCount}`);
    console.log(`Vector size: ${embedding.length}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the addition process
addFileToCollection(filePath);
