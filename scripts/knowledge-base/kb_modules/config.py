"""
Configuration Module
===================

Handles loading and validating configuration settings from environment variables.
"""

import os
import logging
import sys
from dotenv import load_dotenv
from typing import Dict, Any, Optional, List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('config')

# Load environment variables from .env file
logger.info("Loading environment variables from .env file")
load_dotenv()

# Configuration constants with defaults
QDRANT_HOST = os.environ.get("QDRANT_HOST", "localhost")
QDRANT_PORT = os.environ.get("QDRANT_PORT", "6550")
QDRANT_URL = os.environ.get("QDRANT_URL", f"http://{QDRANT_HOST}:{QDRANT_PORT}")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")  # Using your existing key
DEFAULT_COLLECTION_NAME = os.environ.get("QDRANT_COLLECTION", "pooper-knowledge")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-large")
EMBEDDING_DIMENSIONS = 3072  # text-embedding-3-large has 3072 dimensions

# Text chunks should be 1000 tokens or less
MAX_CHUNK_SIZE = int(os.environ.get("MAX_CHUNK_SIZE", "3800"))  # Characters (approximate for ~1000 tokens)
CHUNK_OVERLAP = int(os.environ.get("CHUNK_OVERLAP", "100"))  # Characters of overlap between chunks

# Default file extensions to process
DEFAULT_FILE_EXTENSIONS = ['.py', '.js', '.ts', '.tsx', '.jsx', '.md', '.html', '.css', '.json', '.yaml', '.yml']

# Maximum file size in MB
MAX_FILE_SIZE_MB = int(os.environ.get("MAX_FILE_SIZE_MB", "10"))


def validate_config() -> Dict[str, Any]:
    """
    Validates required configuration is present and returns the config.
    
    Raises:
        ValueError: If required configuration is missing
    
    Returns:
        Dict: Configuration values
    """
    config = {
        "qdrant_url": QDRANT_URL,
        "qdrant_api_key": QDRANT_API_KEY,
        "openai_api_key": OPENAI_API_KEY,
        "default_collection": DEFAULT_COLLECTION_NAME,
        "embedding_model": EMBEDDING_MODEL,
        "embedding_dimensions": EMBEDDING_DIMENSIONS,
        "max_chunk_size": MAX_CHUNK_SIZE,
        "chunk_overlap": CHUNK_OVERLAP,
        "default_file_extensions": DEFAULT_FILE_EXTENSIONS,
        "max_file_size_mb": MAX_FILE_SIZE_MB
    }
    
    # Check for required configuration
    warnings = []
    errors = []
    
    if not config["openai_api_key"]:
        errors.append("OPENAI_API_KEY not found in environment variables")
    
    if not config["qdrant_api_key"]:
        warnings.append("QDRANT_API_KEY not set, using default authentication")
    
    # Log warnings and errors
    for warning in warnings:
        logger.warning(f"Configuration warning: {warning}")
    
    for error in errors:
        logger.error(f"Configuration error: {error}")
    
    # Exit on critical errors
    if errors:
        error_message = "\n".join([
            "Critical configuration errors found:",
            *[f"- {error}" for error in errors],
            "",
            "Please set the required environment variables in your .env file.",
            "Example .env file:",
            "OPENAI_API_KEY=your_openai_api_key",
            "QDRANT_API_KEY=your_qdrant_api_key",
            "QDRANT_URL=http://localhost:6550"
        ])
        raise ValueError(error_message)
    
    logger.info("Configuration validated successfully")
    return config


def get_config(validate: bool = True) -> Dict[str, Any]:
    """
    Returns the current configuration.
    
    Args:
        validate: Whether to validate the configuration
    
    Returns:
        Dict: Configuration values
        
    Raises:
        ValueError: If validation fails and validate=True
    """
    if validate:
        try:
            return validate_config()
        except ValueError as e:
            logger.error(f"Configuration validation failed: {str(e)}")
            raise
    else:
        # Return configuration without validation
        return {
            "qdrant_url": QDRANT_URL,
            "qdrant_api_key": QDRANT_API_KEY,
            "openai_api_key": OPENAI_API_KEY,
            "default_collection": DEFAULT_COLLECTION_NAME,
            "embedding_model": EMBEDDING_MODEL,
            "embedding_dimensions": EMBEDDING_DIMENSIONS,
            "max_chunk_size": MAX_CHUNK_SIZE,
            "chunk_overlap": CHUNK_OVERLAP,
            "default_file_extensions": DEFAULT_FILE_EXTENSIONS,
            "max_file_size_mb": MAX_FILE_SIZE_MB
        }


def format_config_for_display() -> str:
    """
    Formats the configuration for display to users with sensitive data masked.
    
    Returns:
        str: Formatted configuration string
    """
    try:
        config = get_config(validate=False)
        
        # Mask API keys for security
        openai_key = config["openai_api_key"]
        masked_openai = f"{openai_key[:4]}...{openai_key[-4:]}" if openai_key and len(openai_key) > 8 else "Not set"
        
        qdrant_key = config["qdrant_api_key"]
        masked_qdrant = f"{qdrant_key[:4]}...{qdrant_key[-4:]}" if qdrant_key and len(qdrant_key) > 8 else "Not set"
        
        output = [
            "Current environment configuration:",
            f"QDRANT_URL: {config['qdrant_url']}",
            f"QDRANT_API_KEY: {masked_qdrant}",
            f"OPENAI_API_KEY: {masked_openai}",
            f"EMBEDDING_MODEL: {config['embedding_model']}",
            f"DEFAULT_COLLECTION: {config['default_collection']}",
            f"MAX_CHUNK_SIZE: {config['max_chunk_size']} characters",
            f"CHUNK_OVERLAP: {config['chunk_overlap']} characters",
            f"MAX_FILE_SIZE: {config['max_file_size_mb']} MB"
        ]
        
        return "\n".join(output)
    except Exception as e:
        logger.error(f"Error formatting config for display: {str(e)}")
        return f"Error retrieving configuration: {str(e)}"


# Validate configuration on import, but don't exit
try:
    logger.debug("Validating configuration on module import")
    validate_config()
except ValueError as e:
    logger.error(f"Configuration validation failed: {str(e)}")
    # Don't exit here, allow the application to handle the error 