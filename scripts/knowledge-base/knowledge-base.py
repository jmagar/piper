#!/usr/bin/env python3
"""
Knowledge Base Management Tool
=============================

This script serves as the entry point for managing a knowledge base using vector embeddings.
It provides functionality for document indexing, querying, and version management.

Usage:
    ./knowledge-base.py [command] [options]

Available commands:
    create-collection   Create a new collection
    list-collections    List all collections
    add                 Add a document to the knowledge base
    add-directory       Add a directory to the knowledge base
    add-text            Add text to the knowledge base
    query               Query the knowledge base
    versions            Get document versions
    show-env            Show environment configuration

For detailed help on a specific command:
    ./knowledge-base.py [command] --help

Examples:
    ./knowledge-base.py create-collection my-collection
    ./knowledge-base.py add README.md --collection my-collection
    ./knowledge-base.py query "How does the system work?" --limit 3
    ./knowledge-base.py add-directory ./docs --extensions md,txt
"""

import os
import sys
from pathlib import Path

# Add the current directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

try:
    # Import the main function from the CLI module
    from kb_modules.cli import main
except ImportError as e:
    print(f"Error importing knowledge base modules: {e}")
    print("Make sure you have installed all dependencies with: pip install -r requirements.txt")
    sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nOperation interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"Unhandled error: {e}")
        sys.exit(1) 