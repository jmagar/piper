# Setup Instructions

This guide will help you set up and run the Code Watcher tool.

## Prerequisites

- Node.js 18+ installed
- Qdrant vector database (for embeddings storage)

## Installation Steps

1. Install dependencies:

```bash
cd scripts/watcher
pnpm install
```

2. Copy and configure the environment file:

```bash
cp src/.env.example src/.env
```

3. Edit the `.env` file to set your watch paths and other configuration options.

## Running Qdrant

If you don't have Qdrant running already, you can use Docker:

```bash
docker run -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage \
    qdrant/qdrant
```

Or if you prefer to use a different port (as specified in your .env):

```bash
docker run -p 6550:6333 -p 6551:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage \
    qdrant/qdrant
```

## Building the Project

```bash
npm run build
```

This will compile the TypeScript code to the `dist` directory.

## Running the Code Watcher

In development mode (using ts-node):

```bash
npm run dev
```

In production mode (after building):

```bash
npm start
```

With automatic restart when code changes:

```bash
npm run watch
```

## Known TypeScript Issues

If you see TypeScript errors related to missing type declarations, make sure to install these type packages:

```bash
npm install --save-dev @types/glob @types/chokidar
```

The other packages should have bundled type declarations.

## Migrating from Previous Implementation

This implementation is a complete rewrite that combines the functionality of both:
- `file-extension-watcher.ts`
- `embeddings.ts`

The original files remain for reference, but all functionality has been migrated to the new structure under the `src` directory.

## Troubleshooting

- **OpenAI API Issues**: If you encounter issues with OpenAI, the tool will automatically fall back to local embeddings using Transformers.js.
- **Large Codebase Scanning**: For very large codebases, try increasing the `BATCH_SIZE` and `EMBEDDING_INTERVAL_MINUTES` values.
- **Qdrant Connection Issues**: Verify your Qdrant is running and accessible at the URL specified in the `.env` file.