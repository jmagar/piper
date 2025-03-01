#!/usr/bin/env ts-node

/**
 * Script to generate TypeScript API clients from OpenAPI schema
 * Uses openapi-typescript-codegen to generate the client
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OPENAPI_SCHEMA_PATH = path.resolve(__dirname, '../openapi/main.yaml');
const OUTPUT_DIR = path.resolve(__dirname, '../frontend/lib/api/generated');
const PACKAGE_JSON_PATH = path.resolve(__dirname, '../package.json');

// Ensure the output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Check if openapi-typescript-codegen is installed
try {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  const devDependencies = packageJson.devDependencies || {};
  
  if (!devDependencies['openapi-typescript-codegen']) {
    console.log('Installing openapi-typescript-codegen...');
    execSync('pnpm add -D openapi-typescript-codegen', { stdio: 'inherit' });
  }
} catch (error) {
  console.error('Error checking package.json:', error);
  process.exit(1);
}

// Generate the API client
try {
  console.log(`Generating API client from ${OPENAPI_SCHEMA_PATH}...`);
  
  execSync(
    `npx openapi-typescript-codegen --input ${OPENAPI_SCHEMA_PATH} --output ${OUTPUT_DIR} --client fetch --useOptions --exportSchemas true --exportServices true --indent 2`,
    { stdio: 'inherit' }
  );
  
  console.log(`API client generated successfully in ${OUTPUT_DIR}`);
} catch (error) {
  console.error('Error generating API client:', error);
  process.exit(1);
}

// Create an index.ts file to re-export everything
const indexContent = `/**
 * Generated API client from OpenAPI schema
 * This file is auto-generated. Do not edit manually.
 * Generated on: ${new Date().toISOString()}
 */

export * from './models';
export * from './services';
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), indexContent);
console.log('Created index.ts file');

// Create a README.md file with usage instructions
const readmeContent = `# Generated API Client

This directory contains TypeScript API clients generated from the OpenAPI schema.

## Usage

\`\`\`typescript
import { ChatService, ChatMessage } from '@/lib/api/generated';

// Create a new instance of the service
const chatService = new ChatService({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    Authorization: \`Bearer \${token}\`,
  },
});

// Use the service
const messages = await chatService.getChatMessages();
\`\`\`

## Regenerating

To regenerate the API client, run:

\`\`\`bash
pnpm run generate-api
\`\`\`

This will update all files in this directory based on the latest OpenAPI schema.
\`\`\`
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readmeContent);
console.log('Created README.md file');

console.log('API client generation completed successfully!'); 