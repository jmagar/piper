#!/usr/bin/env node

import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
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

// Get query from command line arguments
const query = process.argv.slice(2).join(' ') || 'embedding generator';

async function generateEmbedding(text) {
  try {
    console.log(`Generating embedding for query: "${text}"`);
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

async function searchCollection(queryVector, limit = 5) {
  try {
    console.log(`Searching collection "${qdrantCollection}" for similar vectors...`);
    
    const searchResult = await qdrantClient.search(qdrantCollection, {
      vector: queryVector,
      limit: limit,
      with_payload: true,
    });
    
    return searchResult;
  } catch (error) {
    console.error('Error searching collection:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log(`\n--- Qdrant Search Tool ---`);
    console.log(`Server: ${qdrantUrl}`);
    console.log(`Collection: ${qdrantCollection}`);
    console.log(`Embedding Model: ${embeddingModel}`);
    
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(coll => coll.name === qdrantCollection);
    
    if (!exists) {
      console.error(`Collection "${qdrantCollection}" does not exist!`);
      process.exit(1);
    }
    
    // Get collection info
    const collectionInfo = await qdrantClient.getCollection(qdrantCollection);
    console.log(`Vector size: ${collectionInfo.config.params.vectors.size}`);
    console.log(`Total vectors: ${collectionInfo.vectors_count}`);
    
    // Generate embedding for query
    const queryVector = await generateEmbedding(query);
    
    // Search collection
    const results = await searchCollection(queryVector);
    
    // Display results
    console.log(`\n--- Search Results ---`);
    console.log(`Query: "${query}"`);
    
    if (results.length === 0) {
      console.log(`No results found.`);
    } else {
      console.log(`Found ${results.length} results:\n`);
      
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.payload.path} (Score: ${result.score.toFixed(4)})`);
        console.log(`   Extension: ${result.payload.extension}`);
        console.log(`   Line count: ${result.payload.lineCount}`);
        console.log(`   Last updated: ${new Date(result.payload.lastUpdated).toLocaleString()}`);
        console.log(`   First 100 chars: ${result.payload.content.substring(0, 100).replace(/\n/g, ' ')}...\n`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the search
main();
