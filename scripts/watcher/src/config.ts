import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Content rule interface for file content checks
export interface ContentRule {
  pattern: string;
  message: string;
  required?: boolean;
}

export interface Config {
  // Paths to watch
  watchPaths: string[];
  
  // Specific files to watch (patterns)
  watchFiles: string[];
  
  // File extension watcher configuration
  enableExtensionWatcher: boolean;
  duplicateWarningMessage: string;
  
  // Specific file watcher configuration
  enableFileWatcher: boolean;
  
  // Embeddings configuration
  enableEmbeddings: boolean;
  intervalMinutes: number;
  generateDirectoryTree: boolean;
  
  // Qdrant configuration
  qdrantUrl: string;
  qdrantApiKey: string;
  qdrantCollection: string;
  
  // Embedding model configuration
  useLocalEmbeddings: boolean;
  localModel: string;
  openaiApiKey: string;
  
  // Linting configuration
  lintCommand: string;
  
  // Notification configuration
  useNotifications: boolean;
  gotifyUrl: string;
  gotifyToken: string;
  
  // File filtering
  ignorePatterns: string[];
  maxFileSize: number;
  batchSize: number;
  
  // Output settings
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  colorizeOutput: boolean;
}

// Default content rules for common files
export const contentRules: Record<string, ContentRule[]> = {
  'package.json': [
    {
      pattern: '"tailwindcss": "(?:[~^])?([0-3]\\.[0-9]+\\.[0-9]+)"',
      message: 'TailwindCSS version downgraded below 4.0.0'
    },
    {
      pattern: '"next": "(?:[~^])?([0-9]{1,2}\\.[0-9]+\\.[0-9]+)"',
      message: 'Next.js version should be 15.0.0-canary or higher'
    },
    {
      pattern: '"eslint": "(?:[~^])?([0-8]\\.[0-9]+\\.[0-9]+)"',
      message: 'ESLint version should be 9.0.0 or higher'
    }
  ],
  'eslint.config.mjs': [
    {
      pattern: 'export default \\[',
      message: 'Assign array to a variable before exporting as module default'
    }
  ],
  'tailwind.config.ts': [
    {
      pattern: 'module.exports',
      message: 'TailwindCSS 4 config should use export default instead of module.exports'
    }
  ]
};

export const config: Config = {
  // Paths to watch
  watchPaths: (process.env.WATCH_PATHS || './src,./packages')
    .split(',')
    .map(folder => folder.trim()),
  
  // Specific files to watch
  watchFiles: (process.env.WATCH_FILES || 'package.json,.eslintrc.*,eslint.config.*,globals.css,postcss.config.*,tsconfig.json')
    .split(',')
    .map(file => file.trim()),
  
  // File extension watcher configuration
  enableExtensionWatcher: (process.env.ENABLE_EXTENSION_WATCHER || 'true') === 'true',
  duplicateWarningMessage: process.env.DUPLICATE_WARNING_MESSAGE || 'Potential duplicate file detected',
  
  // Specific file watcher configuration
  enableFileWatcher: (process.env.ENABLE_FILE_WATCHER || 'true') === 'true',
  
  // Embeddings configuration
  enableEmbeddings: (process.env.ENABLE_EMBEDDINGS || 'true') === 'true',
  intervalMinutes: Number(process.env.EMBEDDING_INTERVAL_MINUTES) || 5,
  generateDirectoryTree: (process.env.GENERATE_DIRECTORY_TREE || 'true') === 'true',
  
  // Qdrant configuration
  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
  qdrantApiKey: process.env.QDRANT_API_KEY || '',
  qdrantCollection: process.env.QDRANT_COLLECTION || 'code-embeddings',
  
  // Embedding model configuration
  useLocalEmbeddings: (process.env.USE_LOCAL_EMBEDDINGS || 'true') === 'true',
  localModel: process.env.LOCAL_MODEL || 'Xenova/all-MiniLM-L6-v2',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  
  // Linting configuration
  lintCommand: process.env.LINT_COMMAND || 'pnpm lint',
  
  // Notification configuration
  useNotifications: (process.env.USE_NOTIFICATIONS || 'false') === 'true',
  gotifyUrl: process.env.GOTIFY_URL || '',
  gotifyToken: process.env.GOTIFY_TOKEN || '',
  
  // File filtering
  ignorePatterns: (process.env.IGNORE_PATTERNS || '.git,node_modules,dist,build,.next,*.min.js,*.map')
    .split(',')
    .map(pattern => pattern.trim()),
  maxFileSize: Number(process.env.MAX_FILE_SIZE_KB) || 1024, // in KB
  batchSize: Number(process.env.BATCH_SIZE) || 100,
  
  // Output settings
  logLevel: (process.env.LOG_LEVEL || 'info') as Config['logLevel'],
  colorizeOutput: (process.env.COLORIZE_OUTPUT || 'true') === 'true'
};

// Validate config
if (config.enableEmbeddings) {
  if (!config.useLocalEmbeddings && !config.openaiApiKey) {
    console.warn('Warning: OpenAI embeddings enabled but no API key provided. Falling back to local embeddings.');
    config.useLocalEmbeddings = true;
  }
}

// Validate notification config
if (config.useNotifications) {
  if (!config.gotifyUrl || !config.gotifyToken) {
    console.warn('Warning: Notifications enabled but Gotify URL or token not provided. Notifications will be disabled.');
    config.useNotifications = false;
  }
}

export default config;