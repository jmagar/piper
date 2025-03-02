# 🧠 Knowledge Base Management Script

![Python 3.7+](https://img.shields.io/badge/Python-3.7+-blue.svg)
![OpenAI](https://img.shields.io/badge/OpenAI-Embeddings-green.svg)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-orange.svg)

A Python utility for creating and querying a semantic knowledge base using OpenAI embeddings and Qdrant vector database.

## 🏗️ Architecture

This project follows a modular design pattern with focused modules:

```
kb_modules/
├── __init__.py          # Package initialization
├── config.py            # Configuration and environment variables
├── embeddings.py        # OpenAI embeddings generation
├── document_processor.py # Document chunking and file operations
├── versioning.py        # Version tracking functionality
├── vector_store.py      # Qdrant database operations
├── knowledge_base.py    # Main integration module
└── cli.py               # Command-line interface
```

Each module has a single responsibility:
- **config**: Centralizes all configuration parameters
- **embeddings**: Handles generation of embeddings via OpenAI
- **document_processor**: Manages document chunking and file operations
- **versioning**: Maintains versioning of documents
- **vector_store**: Interfaces with the Qdrant vector database
- **knowledge_base**: Integrates all components for high-level operations
- **cli**: Provides the command-line interface

## 📋 Overview

This script allows you to build a searchable knowledge base of your project's code, documentation, and other text content.

### ✨ Key Features

- 🔍 **Semantic search** across your codebase
- 🧩 **Automatic document chunking** and embedding
- 🏷️ **Metadata filtering** and organization
- 📜 **Version history tracking** for code evolution
- 📦 **Batch processing** for directories and large files
- ⚡ **Payload indexing** for efficient filtering

## 🛠️ Installation

### 📋 Requirements

- 🐍 Python 3.7+
- 🔑 OpenAI API key
- 💾 Qdrant instance (local or cloud)

### 📚 Dependencies

The required packages are specified in `requirements.txt`:

```
openai>=1.0.0
qdrant-client>=1.1.0
python-dotenv>=1.0.0
```

You can install them using one of these methods:

#### 🔄 Using uv (Recommended)

[uv](https://github.com/astral-sh/uv) is a fast Python package installer and resolver:

```bash
# Create a virtual environment
uv venv scripts/knowledge-base/venv

# Activate the virtual environment
source scripts/knowledge-base/venv/bin/activate

# Install dependencies using requirements.txt
uv pip install -r scripts/knowledge-base/requirements.txt
```

> **Note about uv pip sync:** You can also use `uv pip sync scripts/knowledge-base/requirements.txt` which will ensure your environment *exactly* matches the requirements file. This means it will uninstall any packages not explicitly listed in the file. If you only want to add packages without removing existing ones, use `install -r` instead of `sync`.

#### 🐍 Using pip

If you prefer traditional pip:

```bash
# Create a virtual environment
python -m venv scripts/knowledge-base/venv

# Activate the virtual environment
source scripts/knowledge-base/venv/bin/activate

# Install dependencies
pip install openai qdrant-client python-dotenv
```

### ⚙️ Configuration

The script uses environment variables from your `.env` file:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional (defaults shown)
QDRANT_HOST=localhost
QDRANT_PORT=6550
QDRANT_URL=http://localhost:6550
QDRANT_API_KEY=your_qdrant_api_key  # Default will be used if not provided
QDRANT_COLLECTION=pooper-knowledge
EMBEDDING_MODEL=text-embedding-3-large
```

> **Note:** The script uses `text-embedding-3-large` which has 3072 dimensions. If you change the embedding model, you may need to modify the `EMBEDDING_DIMENSIONS` constant in the script.

## 📖 Usage Guide

### ⚡ Running the Script

Always remember to activate the virtual environment before running any commands:

```bash
# Activate the virtual environment first
source scripts/knowledge-base/venv/bin/activate

# Then run your commands
python scripts/knowledge-base/knowledge-base.py list-collections
```

> **Pro Tip:** You can create an alias or shell function to make this easier:
> ```bash
> # Add to your .bashrc or .zshrc
> function kb() {
>   source /path/to/scripts/knowledge-base/venv/bin/activate
>   python /path/to/scripts/knowledge-base/knowledge-base.py "$@"
> }
> ```
> Then you can just use: `kb list-collections`

### 📊 Collection Management

```bash
# Create a collection
python knowledge-base.py create-collection pooper-knowledge

# Force recreate (delete and create) a collection
python knowledge-base.py create-collection pooper-knowledge --force

# List all collections
python knowledge-base.py list-collections
```

> **Pro Tip:** When creating a collection, the script automatically creates payload indexes for efficient filtering on:
> - `metadata.type`
> - `metadata.path`
> - `timestamp`

### 📥 Adding Content

```bash
# Add a single file
python knowledge-base.py add src/components/Button.jsx --metadata '{"type":"component","framework":"react"}'

# Add a documentation file
python knowledge-base.py add docs/api.md --metadata '{"type":"documentation","category":"api"}'

# Add a directory (processes all files recursively)
python knowledge-base.py add-directory src --metadata '{"project":"pooper"}'

# Add only specific file types from a directory
python knowledge-base.py add-directory backend --extensions "py,md,yaml" --metadata '{"type":"backend"}'

# Add to a specific collection
python knowledge-base.py add README.md --collection docs-collection

# Add text directly (without a file)
python knowledge-base.py add-text "Authentication uses JWT tokens with 24h expiration" --metadata '{"topic":"security"}'
```

### 🔎 Querying

```bash
# Basic semantic search
python knowledge-base.py query "How does the WebSocket server work?"

# Increase number of results
python knowledge-base.py query "database connection pool" --limit 10

# Filter by metadata
python knowledge-base.py query "state management" --filters '{"type":"component","framework":"react"}'

# Query including all historical versions (not just latest)
python knowledge-base.py query "authentication flow" --all-versions

# Query a specific collection
python knowledge-base.py query "API endpoints" --collection api-docs
```

#### 📊 Query Results Include

- 📄 The text content matching your query
- 📁 Source file path
- 📅 Version date
- 🧩 Chunk information
- 📊 Similarity score (0-1, where 1 is exact match)

### 📜 Version Management

```bash
# List all versions of a specific file
python knowledge-base.py versions --path "src/components/Auth.jsx"

# List versions in a specific collection
python knowledge-base.py versions --path "config/database.js" --collection backend-code
```

### 🔧 Environment Info

```bash
# Show current configuration
python knowledge-base.py show-env
```

## 🕰️ How Versioning Works

The script implements timestamp-based versioning:

1. ⏱️ Each time you add content, it's stored with a timestamp
2. 🔄 Content with the same path but different content gets a new version
3. 🔍 Queries return only the latest version of each file by default
4. 📚 Use `--all-versions` to see results from historical versions
5. 📋 The `versions` command shows the history of a specific file

## 🧩 Document Chunking

Large documents are automatically split into chunks of approximately **3800 characters** (roughly 1000 tokens) with **100 character overlaps** between chunks. This ensures:

1. ⚡ **Efficient embedding generation** within model token limits
2. 🎯 **Better semantic search accuracy**
3. 📊 **Reasonable result sizes** in queries

## 📁 File Types

The script can process any text-based file. Default extensions include:
- 🐍 `.py`, `.js`, `.ts`, `.tsx`, `.jsx` (code files)
- 📄 `.md`, `.html`, `.css` (markup and style files)

> **Tip:** You can specify custom extensions with the `--extensions` flag.

## 💡 Common Use Cases

- 🤖 **AI Integration:** Help AI tools understand your codebase
- 👨‍💻 **Developer Onboarding:** Enable semantic search of project structure
- 📈 **Code Evolution:** Track implementation changes over time
- 📚 **Documentation:** Make docs semantically searchable
- 🏗️ **Architecture Understanding:** Discover relationships between components
- 📊 **Training Data:** Generate high-quality data for fine-tuning AI models

## 🚀 Advanced Tips

- 💼 **Team Collaboration:** Create separate collections for different projects or teams
- 🔄 **Continuous Integration:** Automate knowledge base updates in your CI/CD pipeline
- 🔍 **Combined Queries:** Use both semantic search and metadata filters for precise results
- 🧪 **Testing:** Create a knowledge base of test cases and expected outputs
- 📊 **Analytics:** Track frequently queried topics to identify documentation gaps

---

📝 **Remember:** The quality of your embeddings depends on the quality of your input text. Clean, well-structured text will yield better search results.