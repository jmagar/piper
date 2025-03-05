#!/usr/bin/env node

import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get current file directory (ES modules equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configuration
const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6550';
const qdrantApiKey = process.env.QDRANT_API_KEY || 'bktvginrwh7UPs9FPoZRxIORaRX5HCRl';
const baseCollection = process.env.QDRANT_COLLECTION || 'pooper-knowledge';
const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-large';

// Model specific collection name
const qdrantCollection = `${baseCollection}-openai3`;

// Initialize client
const qdrantClient = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
});

async function createCollection() {
  try {
    console.log(`\n--- Creating Qdrant Collection for OpenAI Embeddings ---`);
    console.log(`Server: ${qdrantUrl}`);
    console.log(`Collection: ${qdrantCollection}`);
    console.log(`Embedding Model: ${embeddingModel}`);
    
    // Check if collection already exists
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(coll => coll.name === qdrantCollection);
    
    if (exists) {
      console.log(`Collection "${qdrantCollection}" already exists.`);
      
      // Get and display collection info
      const collectionInfo = await qdrantClient.getCollection(qdrantCollection);
      console.log(`Vector size: ${collectionInfo.config.params.vectors.size}`);
      console.log(`Distance: ${collectionInfo.config.params.vectors.distance}`);
      console.log(`Vectors count: ${collectionInfo.vectors_count || 0}`);
      
      const shouldRecreate = process.argv.includes('--recreate');
      
      if (shouldRecreate) {
        console.log(`Recreating collection as requested...`);
        await qdrantClient.deleteCollection(qdrantCollection);
      } else {
        console.log(`Use --recreate flag to recreate the collection if needed.`);
        return;
      }
    }
    
    // Determine vector size based on model
    let vectorSize = 1536; // Default for text-embedding-ada-002
    if (embeddingModel === 'text-embedding-3-large') {
      vectorSize = 3072;
    } else if (embeddingModel === 'text-embedding-3-small') {
      vectorSize = 1536;
    }
    
    console.log(`Creating collection with vector size: ${vectorSize}`);
    
    // Create the collection
    await qdrantClient.createCollection(qdrantCollection, {
      vectors: {
        size: vectorSize,
        distance: 'Cosine'
      }
    });
    
    console.log(`\nCollection "${qdrantCollection}" created successfully!`);
    
    // Generate a UUID for the test point
    const uuid = crypto.randomUUID();
    console.log(`Generated UUID for test point: ${uuid}`);
    
    // Insert a test point to verify the collection works
    const testPoint = {
      id: uuid,
      vector: Array(vectorSize).fill(0).map(() => Math.random() * 2 - 1),
      payload: {
        path: "test-file.ts",
        content: "This is a test vector to verify the collection is working correctly.",
        extension: "ts",
        lineCount: 1,
        lastUpdated: Date.now(),
      }
    };
    
    await qdrantClient.upsert(qdrantCollection, {
      points: [testPoint]
    });
    
    console.log(`Inserted test vector successfully.`);
    console.log(`\nCollection is ready for use with text-embedding-3-large embeddings.`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the creation process
createCollection();
