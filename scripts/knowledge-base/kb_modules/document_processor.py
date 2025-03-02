"""
Document Processor Module
========================

Handles document processing, including reading files and chunking text.
"""

import os
import time
import logging
import traceback
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

from kb_modules.config import MAX_CHUNK_SIZE, CHUNK_OVERLAP, DEFAULT_FILE_EXTENSIONS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('document_processor')

# Constants
MAX_FILE_SIZE_MB = 10  # Maximum file size in MB


def read_file(file_path: str, max_size_mb: float = MAX_FILE_SIZE_MB) -> str:
    """
    Read content from a file with proper encoding and size checks.
    
    Args:
        file_path: Path to the file to read
        max_size_mb: Maximum allowed file size in MB
        
    Returns:
        str: File content
        
    Raises:
        FileNotFoundError: If the file doesn't exist
        PermissionError: If the file can't be read
        ValueError: If the file exceeds the maximum size
    """
    file_path_obj = Path(file_path)
    
    # Check if file exists
    if not file_path_obj.exists():
        logger.error(f"File not found: {file_path}")
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Check file size
    file_size_mb = file_path_obj.stat().st_size / (1024 * 1024)
    if file_size_mb > max_size_mb:
        logger.warning(f"File exceeds size limit: {file_path} ({file_size_mb:.2f} MB > {max_size_mb} MB)")
        raise ValueError(f"File exceeds maximum size of {max_size_mb} MB: {file_path} ({file_size_mb:.2f} MB)")
    
    logger.info(f"Reading file: {file_path} ({file_size_mb:.2f} MB)")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            logger.info(f"Successfully read file with UTF-8 encoding: {file_path}")
            return content
    except UnicodeDecodeError:
        logger.warning(f"UTF-8 decoding failed for {file_path}, trying latin-1")
        # Try with different encoding if UTF-8 fails
        try:
            with open(file_path, 'r', encoding='latin-1') as file:
                content = file.read()
                logger.info(f"Successfully read file with latin-1 encoding: {file_path}")
                return content
        except Exception as e:
            logger.error(f"Failed to read file with latin-1 encoding: {file_path}")
            raise
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {str(e)}")
        raise


def chunk_text(text: str, max_size: int = MAX_CHUNK_SIZE, 
               overlap: int = CHUNK_OVERLAP) -> List[str]:
    """
    Split text into overlapping chunks of approximately max_size characters.
    
    Args:
        text: Text to split into chunks
        max_size: Maximum chunk size in characters
        overlap: Overlap between chunks in characters
        
    Returns:
        List[str]: List of text chunks
    """
    logger.debug(f"Chunking text of length {len(text)} chars (max_size={max_size}, overlap={overlap})")
    
    if not text:
        logger.warning("Empty text provided for chunking")
        return []
        
    if len(text) <= max_size:
        logger.debug("Text fits in a single chunk")
        return [text]
    
    chunks = []
    start = 0
    
    try:
        while start < len(text):
            end = min(start + max_size, len(text))
            
            # Try to find a good break point (newline or space)
            if end < len(text):
                # Prefer breaking at a newline
                newline_pos = text.rfind("\n", start, end)
                if newline_pos > start + max_size // 2:
                    logger.debug(f"Breaking at newline position {newline_pos}")
                    end = newline_pos + 1
                else:
                    # Otherwise break at a space
                    space_pos = text.rfind(" ", start + max_size // 2, end)
                    if space_pos > start:
                        logger.debug(f"Breaking at space position {space_pos}")
                        end = space_pos + 1
            
            # Add chunk
            chunk = text[start:end]
            chunks.append(chunk)
            logger.debug(f"Created chunk {len(chunks)} with {len(chunk)} chars")
            
            # Next chunk starts with overlap
            start = end - overlap
    except Exception as e:
        logger.error(f"Error during text chunking: {str(e)}")
        logger.error(traceback.format_exc())
        raise
    
    logger.info(f"Split text into {len(chunks)} chunks")
    return chunks


class DocumentProcessor:
    """Handles processing documents for the knowledge base."""
    
    def __init__(self, max_chunk_size: int = MAX_CHUNK_SIZE, 
                 chunk_overlap: int = CHUNK_OVERLAP,
                 max_file_size_mb: float = MAX_FILE_SIZE_MB):
        """
        Initialize document processor.
        
        Args:
            max_chunk_size: Maximum chunk size in characters
            chunk_overlap: Overlap between chunks in characters
            max_file_size_mb: Maximum file size in MB
        """
        self.max_chunk_size = max_chunk_size
        self.chunk_overlap = chunk_overlap
        self.max_file_size_mb = max_file_size_mb
        logger.info(f"Initialized document processor (max_chunk_size={max_chunk_size}, chunk_overlap={chunk_overlap})")
    
    def read_file(self, file_path: str) -> str:
        """
        Read a file with size limit checking.
        
        Args:
            file_path: Path to the file
            
        Returns:
            str: File content
        """
        return read_file(file_path, self.max_file_size_mb)
    
    def chunk_text(self, text: str) -> List[str]:
        """
        Split text into chunks.
        
        Args:
            text: Text to split into chunks
            
        Returns:
            List[str]: List of text chunks
        """
        return chunk_text(text, self.max_chunk_size, self.chunk_overlap)
    
    def process_file(self, file_path: str, metadata: Optional[Dict[str, Any]] = None) -> Dict:
        """
        Process a file for adding to the knowledge base.
        
        Args:
            file_path: Path to the file
            metadata: Optional metadata to include
            
        Returns:
            Dict: Processing result with content, chunks, and metadata
            
        Raises:
            FileNotFoundError: If the file doesn't exist
            ValueError: If the file is too large
            Exception: For other processing errors
        """
        logger.info(f"Processing file: {file_path}")
        
        try:
            # Read file content with size limit
            content = self.read_file(file_path)
            
            # Split into chunks
            chunks = self.chunk_text(content)
            
            # Prepare metadata
            if metadata is None:
                metadata = {}
                
            # Add file-specific metadata
            if "source" not in metadata:
                metadata["source"] = file_path
            if "path" not in metadata:
                metadata["path"] = file_path
            if "type" not in metadata:
                metadata["type"] = Path(file_path).suffix.lstrip('.')
            
            logger.info(f"Successfully processed {file_path} into {len(chunks)} chunks")
            
            return {
                "content": content,
                "chunks": chunks,
                "metadata": metadata,
                "chunk_count": len(chunks)
            }
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {str(e)}")
            logger.debug(traceback.format_exc())
            raise
    
    def process_directory(self, directory_path: str, 
                          metadata_base: Dict[str, Any],
                          file_extensions: Optional[List[str]] = None) -> List[Dict]:
        """
        Process all files in a directory.
        
        Args:
            directory_path: Path to the directory
            metadata_base: Base metadata to include for all files
            file_extensions: Optional list of file extensions to include
            
        Returns:
            List[Dict]: List of processing results
        """
        if file_extensions is None:
            file_extensions = DEFAULT_FILE_EXTENSIONS
        
        logger.info(f"Processing directory: {directory_path} with extensions: {file_extensions}")
        
        results = []
        successful_files = 0
        failed_files = 0
        skipped_files = 0
        path = Path(directory_path)
        
        if not path.exists():
            logger.error(f"Directory not found: {directory_path}")
            raise FileNotFoundError(f"Directory not found: {directory_path}")
        
        if not path.is_dir():
            logger.error(f"Not a directory: {directory_path}")
            raise ValueError(f"Not a directory: {directory_path}")
        
        # Get all files first to estimate total
        all_files = []
        for file_path in path.glob('**/*'):
            if file_path.is_file() and (file_extensions is None or file_path.suffix in file_extensions):
                all_files.append(file_path)
        
        logger.info(f"Found {len(all_files)} matching files in {directory_path}")
        
        # Process each file
        for i, file_path in enumerate(all_files):
            # Get relative path for better organization
            rel_path = file_path.relative_to(path).as_posix()
            
            # Create file-specific metadata
            metadata = {
                **metadata_base,
                "source": str(file_path),
                "type": file_path.suffix.lstrip('.'),
                "path": rel_path
            }
            
            # Process file
            try:
                # Check file size before full processing
                file_size_mb = file_path.stat().st_size / (1024 * 1024)
                if file_size_mb > self.max_file_size_mb:
                    logger.warning(f"Skipping file exceeding size limit: {rel_path} ({file_size_mb:.2f} MB > {self.max_file_size_mb} MB)")
                    skipped_files += 1
                    continue
                
                logger.info(f"Processing file {i+1}/{len(all_files)}: {rel_path}")
                result = self.process_file(str(file_path), metadata)
                results.append(result)
                successful_files += 1
                logger.info(f"Successfully processed: {rel_path} ({len(result['chunks'])} chunks)")
            except Exception as e:
                failed_files += 1
                logger.error(f"Error processing {rel_path}: {str(e)}")
                logger.debug(traceback.format_exc())
        
        logger.info(f"Directory processing complete: {successful_files} successful, {failed_files} failed, {skipped_files} skipped")
        return results


# Create default instance
logger.info("Creating default document processor")
default_document_processor = DocumentProcessor() 