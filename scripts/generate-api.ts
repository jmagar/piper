import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { generate } from 'openapi-typescript-codegen';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENAPI_DIR = resolve(__dirname, '../openapi');
const FRONTEND_DIR = resolve(__dirname, '../frontend');
const BACKEND_DIR = resolve(__dirname, '../backend');

async function main() {
  console.log('Generating API client and types...');

  // Generate TypeScript client for frontend
  await generate({
    input: resolve(OPENAPI_DIR, 'main.yaml'),
    output: resolve(FRONTEND_DIR, 'lib/generated'),
    httpClient: 'fetch',
    useOptions: true,
    useUnionTypes: true,
    exportCore: true,
    exportServices: true,
    exportModels: true,
    exportSchemas: true,
    indent: "2",
    postfixServices: 'Service',
    write: true,
  });

  // Generate server-side code
  console.log('Generating server code...');
  execSync(
    'openapi-generator-cli generate ' +
    `-i ${resolve(OPENAPI_DIR, 'main.yaml')} ` +
    `-g typescript-node ` +
    `-o ${resolve(BACKEND_DIR, 'src/generated')} ` +
    '--additional-properties=supportsES6=true,npmName=@api/server'
  );

  console.log('API generation complete!');
}

main().catch(console.error); 