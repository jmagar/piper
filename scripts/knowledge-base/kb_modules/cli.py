"""
Command Line Interface
=================

Command-line interface for knowledge base management.
"""

import os
import sys
import json
import logging
import argparse
import traceback
from typing import Dict, List, Any, Optional

from kb_modules.config import get_config, DEFAULT_COLLECTION_NAME
from kb_modules.knowledge_base import default_knowledge_base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('kb_cli')


def setup_logging(verbose: bool = False):
    """
    Configure logging level based on verbosity.
    
    Args:
        verbose: If True, set logging level to DEBUG
    """
    root_logger = logging.getLogger()
    
    if verbose:
        root_logger.setLevel(logging.DEBUG)
        logger.debug("Debug logging enabled")
    else:
        root_logger.setLevel(logging.INFO)


def parse_metadata(metadata_str: str) -> Dict[str, Any]:
    """
    Parse metadata string into dictionary.
    
    Args:
        metadata_str: JSON string of metadata
        
    Returns:
        Dict[str, Any]: Parsed metadata
        
    Raises:
        ValueError: If metadata is not valid JSON
    """
    if not metadata_str:
        return {}
        
    try:
        return json.loads(metadata_str)
    except json.JSONDecodeError:
        raise ValueError(f"Invalid metadata JSON: {metadata_str}")


def parse_file_extensions(extensions_str: str) -> List[str]:
    """
    Parse comma-separated file extensions.
    
    Args:
        extensions_str: Comma-separated string of extensions
        
    Returns:
        List[str]: List of extensions
    """
    if not extensions_str:
        # Default extensions
        return ['.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.yaml', '.yml']
        
    return [ext.strip() for ext in extensions_str.split(',')]


def handle_create_collection(args):
    """
    Handle create-collection command.
    
    Args:
        args: Command arguments
    """
    collection_name = args.name
    force = args.force
    
    logger.info(f"Creating collection '{collection_name}' (force={force})")
    
    try:
        success = default_knowledge_base.create_collection(collection_name, force)
        
        if success:
            print(f"Collection '{collection_name}' created successfully")
        else:
            print(f"Failed to create collection '{collection_name}'")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Error creating collection: {str(e)}")
        if args.verbose:
            logger.debug(traceback.format_exc())
        print(f"Error: {str(e)}")
        sys.exit(1)


def handle_list_collections(args):
    """
    Handle list-collections command.
    
    Args:
        args: Command arguments
    """
    logger.info("Listing collections")
    
    try:
        collections = default_knowledge_base.list_collections()
        
        if collections:
            print("Available collections:")
            for collection in collections:
                print(f" - {collection}")
        else:
            print("No collections found")
    except Exception as e:
        logger.error(f"Error listing collections: {str(e)}")
        if args.verbose:
            logger.debug(traceback.format_exc())
        print(f"Error: {str(e)}")
        sys.exit(1)


def handle_add(args):
    """
    Handle add command.
    
    Args:
        args: Command arguments
    """
    file_path = args.file
    collection_name = args.collection
    
    # Validate file exists
    if not os.path.isfile(file_path):
        print(f"Error: File not found: {file_path}")
        sys.exit(1)
    
    # Parse metadata
    try:
        metadata = parse_metadata(args.metadata)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    
    logger.info(f"Adding file '{file_path}' to collection '{collection_name}'")
    logger.debug(f"Metadata: {metadata}")
    
    try:
        success, chunks = default_knowledge_base.add_document(
            file_path=file_path,
            metadata=metadata,
            collection_name=collection_name
        )
        
        if success:
            print(f"Successfully added document '{file_path}' with {chunks} chunks")
        else:
            print(f"Failed to add document '{file_path}'")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Error adding document: {str(e)}")
        if args.verbose:
            logger.debug(traceback.format_exc())
        print(f"Error: {str(e)}")
        sys.exit(1)


def handle_add_directory(args):
    """
    Handle add-directory command.
    
    Args:
        args: Command arguments
    """
    directory = args.directory
    collection_name = args.collection
    
    # Validate directory exists
    if not os.path.isdir(directory):
        print(f"Error: Directory not found: {directory}")
        sys.exit(1)
    
    # Parse metadata
    try:
        metadata = parse_metadata(args.metadata)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    
    # Parse extensions
    extensions = parse_file_extensions(args.extensions)
    
    logger.info(f"Adding directory '{directory}' to collection '{collection_name}'")
    logger.debug(f"Metadata: {metadata}")
    logger.debug(f"Extensions: {extensions}")
    
    try:
        success, total_chunks = default_knowledge_base.add_directory(
            directory=directory,
            metadata=metadata,
            extensions=extensions,
            collection_name=collection_name
        )
        
        if success:
            print(f"Successfully processed directory '{directory}' with {total_chunks} total chunks")
        else:
            print(f"Failed to process directory '{directory}'")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Error processing directory: {str(e)}")
        if args.verbose:
            logger.debug(traceback.format_exc())
        print(f"Error: {str(e)}")
        sys.exit(1)


def handle_add_text(args):
    """
    Handle add-text command.
    
    Args:
        args: Command arguments
    """
    text = args.text
    collection_name = args.collection
    
    # Parse metadata
    try:
        metadata = parse_metadata(args.metadata)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    
    logger.info(f"Adding text to collection '{collection_name}'")
    logger.debug(f"Metadata: {metadata}")
    
    try:
        success, chunks = default_knowledge_base.add_text(
            text=text,
            metadata=metadata,
            collection_name=collection_name
        )
        
        if success:
            print(f"Successfully added text with {chunks} chunks")
        else:
            print("Failed to add text")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Error adding text: {str(e)}")
        if args.verbose:
            logger.debug(traceback.format_exc())
        print(f"Error: {str(e)}")
        sys.exit(1)


def handle_query(args):
    """
    Handle query command.
    
    Args:
        args: Command arguments
    """
    query_text = args.text
    limit = args.limit
    collection_name = args.collection
    
    # Parse filters
    try:
        filters = parse_metadata(args.filters) if args.filters else None
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    
    logger.info(f"Querying collection '{collection_name}' with '{query_text}'")
    if filters:
        logger.debug(f"Filters: {filters}")
    
    try:
        results = default_knowledge_base.query(
            query_text=query_text,
            limit=limit,
            filters=filters,
            collection_name=collection_name
        )
        
        if results:
            print(f"Found {len(results)} results:")
            for i, result in enumerate(results, 1):
                print(f"\n--- Result {i} (Score: {result['score']:.4f}) ---")
                print(f"Path: {result['metadata'].get('path', 'unknown')}")
                if 'version_date' in result:
                    print(f"Version: {result['version_date']}")
                print("\nText:")
                print(result['text'])
                print("\n" + "-" * 50)
        else:
            print("No results found")
    except Exception as e:
        logger.error(f"Error querying knowledge base: {str(e)}")
        if args.verbose:
            logger.debug(traceback.format_exc())
        print(f"Error: {str(e)}")
        sys.exit(1)


def handle_versions(args):
    """
    Handle versions command.
    
    Args:
        args: Command arguments
    """
    path = args.path
    collection_name = args.collection
    
    logger.info(f"Getting versions for document '{path}' in collection '{collection_name}'")
    
    try:
        versions = default_knowledge_base.get_document_versions(
            path=path,
            collection_name=collection_name
        )
        
        if versions:
            print(f"Found {len(versions)} versions of '{path}':")
            for i, (timestamp, date) in enumerate(versions, 1):
                print(f"{i}. {date} (timestamp: {timestamp})")
        else:
            print(f"No versions found for '{path}'")
    except Exception as e:
        logger.error(f"Error retrieving document versions: {str(e)}")
        if args.verbose:
            logger.debug(traceback.format_exc())
        print(f"Error: {str(e)}")
        sys.exit(1)


def handle_show_env(args):
    """
    Handle show-env command.
    
    Args:
        args: Command arguments
    """
    config = get_config()
    
    # Mask API keys for security
    secure_config = config.copy()
    if 'openai_api_key' in secure_config:
        key = secure_config['openai_api_key']
        if key:
            secure_config['openai_api_key'] = key[:4] + '...' + key[-4:] if len(key) > 8 else '***'
    if 'qdrant_api_key' in secure_config:
        key = secure_config['qdrant_api_key']
        if key:
            secure_config['qdrant_api_key'] = key[:4] + '...' + key[-4:] if len(key) > 8 else '***'
    
    print("Current environment configuration:")
    for key, value in secure_config.items():
        print(f"{key}: {value}")


def create_argument_parser():
    """
    Create argument parser for CLI.
    
    Returns:
        argparse.ArgumentParser: Configured argument parser
    """
    parser = argparse.ArgumentParser(
        description="Knowledge Base Management CLI",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Add global arguments
    parser.add_argument('-v', '--verbose', action='store_true', help="Enable verbose logging")
    
    # Create subparsers for commands
    subparsers = parser.add_subparsers(dest='command', help="Command to execute")
    
    # Create collection command
    create_parser = subparsers.add_parser('create-collection', help="Create a new collection")
    create_parser.add_argument('name', help="Collection name")
    create_parser.add_argument('--force', action='store_true', help="Force recreation if collection exists")
    create_parser.set_defaults(func=handle_create_collection)
    
    # List collections command
    list_parser = subparsers.add_parser('list-collections', help="List all collections")
    list_parser.set_defaults(func=handle_list_collections)
    
    # Add document command
    add_parser = subparsers.add_parser('add', help="Add a document to the knowledge base")
    add_parser.add_argument('file', help="File path")
    add_parser.add_argument('--metadata', help="JSON metadata string")
    add_parser.add_argument('--collection', default=DEFAULT_COLLECTION_NAME, help="Collection name")
    add_parser.set_defaults(func=handle_add)
    
    # Add directory command
    add_dir_parser = subparsers.add_parser('add-directory', help="Add a directory to the knowledge base")
    add_dir_parser.add_argument('directory', help="Directory path")
    add_dir_parser.add_argument('--metadata', help="JSON metadata string")
    add_dir_parser.add_argument('--extensions', help="Comma-separated list of file extensions")
    add_dir_parser.add_argument('--collection', default=DEFAULT_COLLECTION_NAME, help="Collection name")
    add_dir_parser.set_defaults(func=handle_add_directory)
    
    # Add text command
    add_text_parser = subparsers.add_parser('add-text', help="Add text to the knowledge base")
    add_text_parser.add_argument('text', help="Text to add")
    add_text_parser.add_argument('--metadata', help="JSON metadata string")
    add_text_parser.add_argument('--collection', default=DEFAULT_COLLECTION_NAME, help="Collection name")
    add_text_parser.set_defaults(func=handle_add_text)
    
    # Query command
    query_parser = subparsers.add_parser('query', help="Query the knowledge base")
    query_parser.add_argument('text', help="Query text")
    query_parser.add_argument('--limit', type=int, default=5, help="Maximum number of results")
    query_parser.add_argument('--filters', help="JSON filter string")
    query_parser.add_argument('--collection', default=DEFAULT_COLLECTION_NAME, help="Collection name")
    query_parser.set_defaults(func=handle_query)
    
    # Versions command
    versions_parser = subparsers.add_parser('versions', help="Get document versions")
    versions_parser.add_argument('path', help="Document path")
    versions_parser.add_argument('--collection', default=DEFAULT_COLLECTION_NAME, help="Collection name")
    versions_parser.set_defaults(func=handle_versions)
    
    # Show environment command
    show_env_parser = subparsers.add_parser('show-env', help="Show environment configuration")
    show_env_parser.set_defaults(func=handle_show_env)
    
    return parser


def main():
    """
    Main entry point for CLI.
    """
    parser = create_argument_parser()
    args = parser.parse_args()
    
    # Configure logging based on verbosity
    setup_logging(args.verbose)
    
    # If no command specified, show help
    if not hasattr(args, 'func'):
        parser.print_help()
        sys.exit(1)
    
    try:
        # Run command handler
        args.func(args)
    except KeyboardInterrupt:
        logger.warning("Operation interrupted by user")
        print("\nOperation interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}")
        if args.verbose:
            logger.debug(traceback.format_exc())
        print(f"Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main() 