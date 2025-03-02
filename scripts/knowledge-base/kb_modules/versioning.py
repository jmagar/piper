"""
Versioning Module
===============

Handles document versioning functionality.
"""

import time
import datetime
import uuid
from typing import Dict, Any, List, Tuple, Optional


def get_current_timestamp() -> int:
    """
    Get current Unix timestamp in seconds.
    
    Returns:
        int: Current timestamp
    """
    return int(time.time())


def format_timestamp(timestamp: int) -> str:
    """
    Format Unix timestamp as human-readable string.
    
    Args:
        timestamp: Unix timestamp
        
    Returns:
        str: Formatted date string (YYYY-MM-DD HH:MM:SS)
    """
    dt = datetime.datetime.fromtimestamp(timestamp)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def format_version_info(versions: List[Tuple[int, str]]) -> str:
    """
    Format version information for display.
    
    Args:
        versions: List of (timestamp, date_string) tuples
        
    Returns:
        str: Formatted version information
    """
    if not versions:
        return "No versions found."
    
    lines = [f"Found {len(versions)} versions:"]
    for i, (timestamp, date_str) in enumerate(versions):
        lines.append(f"{i+1}. {date_str} (timestamp: {timestamp})")
    
    return "\n".join(lines)


def prepare_version_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Prepares version metadata for a document by adding timestamp.
    
    Args:
        metadata: Document metadata
        
    Returns:
        Dict: Updated metadata with version information
    """
    timestamp = get_current_timestamp()
    
    # Add version information
    metadata_with_version = {
        **metadata,
        "timestamp": timestamp,
        "version_date": format_timestamp(timestamp)
    }
    
    return metadata_with_version


class VersionManager:
    """Manages document versioning functionality."""
    
    def __init__(self):
        """Initialize version manager."""
        pass
    
    def get_timestamp(self) -> int:
        """
        Get current Unix timestamp in seconds.
        
        Returns:
            int: Current timestamp
        """
        return get_current_timestamp()
    
    def format_timestamp(self, timestamp: int) -> str:
        """
        Format Unix timestamp as human-readable string.
        
        Args:
            timestamp: Unix timestamp
            
        Returns:
            str: Formatted date string (YYYY-MM-DD HH:MM:SS)
        """
        return format_timestamp(timestamp)
    
    def get_versioned_id(self, base_id: str, timestamp: int, chunk_index: int = 0) -> str:
        """
        Get a versioned ID for a document chunk. Alias for create_versioned_id.
        
        Args:
            base_id: Base identifier for the document (usually path)
            timestamp: Document version timestamp
            chunk_index: Chunk index
            
        Returns:
            str: Versioned document ID (as a UUID)
        """
        return self.create_versioned_id(path=base_id, timestamp=timestamp, chunk_index=chunk_index)
    
    def create_versioned_id(self, path: str, timestamp: int, chunk_index: int = 0) -> str:
        """
        Create a versioned ID for a document chunk.
        
        Args:
            path: Document path
            timestamp: Document version timestamp
            chunk_index: Chunk index
            
        Returns:
            str: Versioned document ID (as a UUID)
        """
        # Generate a UUID based on the path, timestamp, and chunk_index
        # Convert the string to a UUID5 using a namespace
        namespace = uuid.NAMESPACE_URL
        name = f"{path}_{timestamp}_{chunk_index}"
        return str(uuid.uuid5(namespace, name))
    
    def create_versioned_payload(self, text: str, metadata: Dict[str, Any], 
                                 chunk_index: int, total_chunks: int) -> Dict[str, Any]:
        """
        Create a versioned payload for a document chunk.
        
        Args:
            text: Chunk text
            metadata: Document metadata
            chunk_index: Chunk index
            total_chunks: Total number of chunks
            
        Returns:
            Dict: Versioned payload
        """
        # Ensure metadata has timestamp
        if "timestamp" not in metadata:
            metadata = prepare_version_metadata(metadata)
        
        return {
            "text": text,
            "chunk_index": chunk_index,
            "total_chunks": total_chunks,
            "timestamp": metadata["timestamp"],
            "version_date": metadata["version_date"],
            "metadata": metadata
        }


# Create default instance
default_version_manager = VersionManager() 