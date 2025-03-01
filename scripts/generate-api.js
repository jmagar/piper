#!/usr/bin/env ts-node
"use strict";
/**
 * Script to generate TypeScript API clients from OpenAPI schema
 * Uses openapi-typescript-codegen to generate the client
 */
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
var fs = require("fs");
var path = require("path");
var url_1 = require("url");
// Get current directory in ESM
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path.dirname(__filename);
// Configuration
var OPENAPI_SCHEMA_PATH = path.resolve(__dirname, '../openapi/main.yaml');
var OUTPUT_DIR = path.resolve(__dirname, '../frontend/lib/api/generated');
var PACKAGE_JSON_PATH = path.resolve(__dirname, '../package.json');
// Ensure the output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
// Check if openapi-typescript-codegen is installed
try {
    var packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    var devDependencies = packageJson.devDependencies || {};
    if (!devDependencies['openapi-typescript-codegen']) {
        console.log('Installing openapi-typescript-codegen...');
        (0, child_process_1.execSync)('pnpm add -D openapi-typescript-codegen', { stdio: 'inherit' });
    }
}
catch (error) {
    console.error('Error checking package.json:', error);
    process.exit(1);
}
// Generate the API client
try {
    console.log("Generating API client from ".concat(OPENAPI_SCHEMA_PATH, "..."));
    (0, child_process_1.execSync)("npx openapi-typescript-codegen --input ".concat(OPENAPI_SCHEMA_PATH, " --output ").concat(OUTPUT_DIR, " --client fetch --useOptions --exportSchemas true --exportServices true --indent 2"), { stdio: 'inherit' });
    console.log("API client generated successfully in ".concat(OUTPUT_DIR));
}
catch (error) {
    console.error('Error generating API client:', error);
    process.exit(1);
}
// Create an index.ts file to re-export everything
var indexContent = "/**\n * Generated API client from OpenAPI schema\n * This file is auto-generated. Do not edit manually.\n * Generated on: ".concat(new Date().toISOString(), "\n */\n\nexport * from './models';\nexport * from './services';\n");
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), indexContent);
console.log('Created index.ts file');
// Create a README.md file with usage instructions
var readmeContent = "# Generated API Client\n\nThis directory contains TypeScript API clients generated from the OpenAPI schema.\n\n## Usage\n\n```typescript\nimport { ChatService, ChatMessage } from '@/lib/api/generated';\n\n// Create a new instance of the service\nconst chatService = new ChatService({\n  baseUrl: process.env.NEXT_PUBLIC_API_URL,\n  headers: {\n    Authorization: `Bearer ${token}`,\n  },\n});\n\n// Use the service\nconst messages = await chatService.getChatMessages();\n```\n\n## Regenerating\n\nTo regenerate the API client, run:\n\n```bash\npnpm run generate-api\n```\n\nThis will update all files in this directory based on the latest OpenAPI schema.\n```\n";
fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readmeContent);
console.log('Created README.md file');
console.log('API client generation completed successfully!');
