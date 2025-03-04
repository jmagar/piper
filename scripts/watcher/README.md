# Code Watcher

A powerful tool that combines file extension watching (to detect duplicate files) with specific file monitoring and code embeddings generation for semantic search. This is particularly useful for catching potential mistakes when working with AI-generated code.

## Features

- **File Extension Watcher**: Detects when multiple files with the same name but different extensions exist (e.g., `component.jsx` and `component.tsx`)
- **Specific File Watcher**: Monitors important configuration files and catches common AI mistakes:
  - ESLint 9 config file: Warns when `.eslintrc.*` exists instead of `eslint.config.mjs`
  - TailwindCSS 4: Detects downgraded versions in package.json
  - Next.js: Detects downgraded versions in package.json
  - Custom rules: Add your own file rules via configuration
- **Code Embeddings Generator**: Creates vector embeddings for your code files to enable semantic search
- **Directory Tree Visualization**: Generates ASCII tree representation of your codebase structure
- **Configurable Watching**: Watch multiple directories with customizable ignore patterns
- **Metadata Tracking**: Records line counts, file hashes, and timestamps
- **Flexible Embedding Options**: Use local embeddings (via Transformers.js) or OpenAI's API

## Installation

1. Navigate to the watcher directory:
```bash
cd scripts/watcher
```

2. Install dependencies:
```bash
npm install
```

## Configuration

Copy the example environment file and modify as needed:

```bash
cp src/.env.example src/.env
```

Key configuration options:

- `WATCH_PATHS`: Comma-separated list of directories to watch (relative to project root)
- `ENABLE_EXTENSION_WATCHER`: Enable/disable file extension duplicate detection
- `ENABLE_FILE_WATCHER`: Enable/disable specific file monitoring
- `WATCH_FILE_RULES`: JSON array of custom file rules (see below)
- `ENABLE_EMBEDDINGS`: Enable/disable code embeddings generation
- `EMBEDDING_INTERVAL_MINUTES`: How often to scan for changes (5 minutes by default)
- `QDRANT_URL` and `QDRANT_API_KEY`: Configure your Qdrant vector database connection
- `USE_LOCAL_EMBEDDINGS`: Use local embeddings model instead of OpenAI (reduces costs and works offline)

### Custom File Rules

In addition to the built-in rules for ESLint, TailwindCSS, and Next.js, you can define your own file monitoring rules using the `WATCH_FILE_RULES` environment variable. Here's an example:

```json
[
  {
    "path": "firebase.json",
    "description": "Firebase configuration",
    "alternatives": ["firebase.js", ".firebaserc"]
  },
  {
    "path": "vite.config.js",
    "description": "Vite configuration",
    "contentRules": [
      {
        "pattern": "webpack",
        "message": "Webpack reference found in Vite config",
        "required": false
      }
    ]
  }
]
```

Each rule can include:
- `path`: The file path to monitor (relative to watch paths)
- `description`: Human-readable description of the rule
- `alternatives`: Array of alternative file paths that shouldn't exist
- `contentRules`: Array of content validation rules with regex patterns

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
# Build the TypeScript code
npm run build

# Run the compiled code
npm start
```

### Watching Mode (auto-restart on code changes)

```bash
npm run watch
```

## How It Works

1. **Initialization**: The tool scans all specified directories to build an index of files
2. **File Extension Watching**: Monitors for files with the same basename but different extensions
3. **Specific File Monitoring**: Checks for common configuration mistakes, version downgrades, and improper file formats
4. **Embeddings Generation**: Creates vector embeddings for code files and stores them in Qdrant
5. **Continuous Monitoring**: Watches for file system changes and updates the indices accordingly

## Example Output

When a duplicate file is detected:

```
[2025-03-04T06:03:26.789Z] [DUPLICATE] ⚠️ AI may have created duplicate files with different extensions: 'Button' with extensions: jsx, tsx

   1. frontend/components/Button.jsx
   2. frontend/components/Button.tsx

================================================================================
```

When an improper file format is detected:

```
[2025-03-04T06:05:12.345Z] [WARN] ESLint 9 uses eslint.config.mjs instead of .eslintrc.mjs

   Found alternative files that may be incorrect:
   1. ./frontend/.eslintrc.js (should be eslint.config.mjs)

================================================================================
```

When a package version downgrade is detected:

```
[2025-03-04T06:07:45.678Z] [WARN] Content rule violation in ./package.json:
   TailwindCSS version downgraded below 4.0.0
   Found: 3.3.0
================================================================================
```

## Notes on Resource Usage

Running the tool with a 5-minute interval for embeddings generation is reasonable for most projects, as:

1. It only processes files that have changed since the last scan
2. The local embedding model (Xenova/all-MiniLM-L6-v2) is lightweight
3. Batching is used to process files efficiently

For very large codebases, you may want to increase the interval or disable the embeddings generation entirely.