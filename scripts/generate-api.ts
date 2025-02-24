import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { generate } from 'openapi-typescript-codegen';
import fs from 'fs/promises';
import { existsSync, readFileSync, rmSync } from 'fs';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENAPI_DIR = resolve(__dirname, '../openapi');
const FRONTEND_DIR = resolve(__dirname, '../frontend');
const BACKEND_DIR = resolve(__dirname, '../backend');

/**
 * Main generation function
 */
async function main() {
  try {
    const specPath = resolve(OPENAPI_DIR, 'main.yaml');
    
    // Clean up old generated files
    console.log(chalk.blue('Cleaning up old generated files...'));
    if (existsSync(resolve(FRONTEND_DIR, 'lib/generated'))) {
      rmSync(resolve(FRONTEND_DIR, 'lib/generated'), { recursive: true });
    }
    if (existsSync(resolve(BACKEND_DIR, 'src/generated'))) {
      rmSync(resolve(BACKEND_DIR, 'src/generated'), { recursive: true });
    }
    console.log(chalk.green('✓ Cleaned up old files'));

    // Generate frontend TypeScript client
    console.log(chalk.blue('Generating frontend API client...'));
    await generate({
      input: specPath,
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
    });
    console.log(chalk.green('✓ Generated frontend client'));

    // Generate backend code using OpenAPI Generator CLI
    console.log(chalk.blue('Generating backend code...'));
    execSync(
      'openapi-generator-cli generate ' +
      `-i ${specPath} ` +
      `-g typescript-node ` +
      `-o ${resolve(BACKEND_DIR, 'src/generated')} ` +
      '--additional-properties=' + [
        'supportsES6=true',
        'npmName=@api/server',
        'platform=node',
        'useObjectParameters=true',
        'useSingleRequestParameter=true',
        'modelPropertyNaming=camelCase',
        'enumPropertyNaming=camelCase',
        'paramNaming=camelCase',
        'fileNaming=camelCase',
        'enumUnknownDefaultCase=false',
        'removeEnumValuePrefix=true',
        'removeOperationIdPrefix=true',
        'sortParamsByRequiredFlag=true',
        'baseClass=BaseAPI',
        'modelBaseClass=BaseModel',
        'usePromises=true',
        'nullSafeAdditionalProps=true',
        'supportsPatternProperties=true',
        'legacyDiscriminatorBehavior=false',
        'withSeparateModelsAndApi=true',
        'apiPackage=api',
        'modelPackage=models',
        'skipGitPush=true',
        'skipGitIgnore=true',
        'skipPackageJson=true',
        'ensureUniqueParams=true',
        'useDateTimeOffset=true',
        'useInheritance=true',
        'useOptional=true',
        'useReadOnlyProperties=true',
        'useTypeOverride=true',
        'validateRequired=true',
        'useSecuritySchemes=true',
        'useBearerToken=true',
        'useImportMaps=true',
        'useClassTransformer=true',
        'useDynamicAccess=false',
        'generateMetadata=true',
        'generateSchemaTypes=true',
        'generateValidationRules=true'
      ].join(',')
    );
    console.log(chalk.green('✓ Generated backend code'));

    console.log(chalk.green('\n✨ API generation complete!'));
  } catch (error) {
    console.error(chalk.red('\n✗ API generation failed:'));
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error); 