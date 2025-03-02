"""
Knowledge Base Module
===================

Main module integrating all components to provide the knowledge base functionality.
"""

import os
import logging
import traceback
from typing import Dict, List, Any, Optional, Tuple, Union

from qdrant_client.http import models

from kb_modules.config import DEFAULT_COLLECTION_NAME, get_config
from kb_modules.document_processor import DocumentProcessor, default_document_processor, read_file, chunk_text
from kb_modules.embeddings import get_embedding, get_embeddings, EmbeddingError
from kb_modules.vector_store import VectorStore, default_vector_store
from kb_modules.versioning import VersionManager, default_version_manager, get_current_timestamp, format_timestamp

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('knowledge_base')

# Maximum batch size for processing chunks
MAX_EMBEDDING_BATCH_SIZE = 16


class KnowledgeBase:
    """
    Main knowledge base class that integrates document processing,
    embedding generation, and vector database operations.
    """
    
    def __init__(self, 
                 collection_name: str = DEFAULT_COLLECTION_NAME,
                 vector_store: Optional[VectorStore] = None,
                 document_processor: Optional[DocumentProcessor] = None,
                 version_manager: Optional[VersionManager] = None):
        """
        Initialize knowledge base.
        
        Args:
            collection_name: Collection name to use
            vector_store: Vector store instance
            document_processor: Document processor instance
            version_manager: Version manager instance
        """
        self.collection_name = collection_name
        self.vector_store = vector_store or default_vector_store
        self.document_processor = document_processor or default_document_processor
        self.version_manager = version_manager or default_version_manager
        
        logger.info(f"Initialized Knowledge Base with collection '{collection_name}'")
    
    def create_collection(self, name: Optional[str] = None, force: bool = False) -> bool:
        """
        Create a collection for the knowledge base.
        
        Args:
            name: Collection name (defaults to self.collection_name)
            force: If True, recreate collection if it exists
            
        Returns:
            bool: True if successfully created
        """
        collection_name = name or self.collection_name
        logger.info(f"Creating collection '{collection_name}' (force={force})")
        return self.vector_store.create_collection(collection_name, force)
    
    def list_collections(self) -> List[str]:
        """
        List all collections in the database.
        
        Returns:
            List[str]: Collection names
        """
        logger.info("Listing all collections")
        return self.vector_store.list_collections()
    
    def add_document(self, 
                     file_path: str, 
                     metadata: Optional[Dict[str, Any]] = None,
                     collection_name: Optional[str] = None) -> Tuple[bool, int]:
        """
        Add a document to the knowledge base.
        
        Args:
            file_path: Path to the document
            metadata: Optional metadata to associate with the document
            collection_name: Collection name (defaults to self.collection_name)
            
        Returns:
            Tuple[bool, int]: (Success status, Number of chunks added)
        """
        collection_name = collection_name or self.collection_name
        metadata = metadata or {}
        metadata["type"] = metadata.get("type", "document")
        metadata["path"] = file_path
        
        logger.info(f"Adding document '{file_path}' to collection '{collection_name}'")
        
        try:
            # Read and process the document
            logger.info(f"Processing document '{file_path}'")
            content = self.document_processor.read_file(file_path)
            chunks = self.document_processor.chunk_text(content)
            
            if not chunks:
                logger.warning(f"No chunks generated from document '{file_path}'")
                return False, 0
            
            logger.info(f"Generated {len(chunks)} chunks from document '{file_path}'")
            
            # Process chunks in batches for better performance and reliability
            return self._process_chunks(chunks, metadata, collection_name)
        except Exception as e:
            logger.error(f"Error adding document '{file_path}': {str(e)}")
            logger.debug(traceback.format_exc())
            return False, 0
    
    def add_text(self, 
                text: str, 
                metadata: Optional[Dict[str, Any]] = None,
                collection_name: Optional[str] = None) -> Tuple[bool, int]:
        """
        Add text directly to the knowledge base.
        
        Args:
            text: Text to add
            metadata: Optional metadata to associate with the text
            collection_name: Collection name (defaults to self.collection_name)
            
        Returns:
            Tuple[bool, int]: (Success status, Number of chunks added)
        """
        collection_name = collection_name or self.collection_name
        metadata = metadata or {}
        metadata["type"] = metadata.get("type", "text")
        
        logger.info(f"Adding text (length: {len(text)}) to collection '{collection_name}'")
        
        try:
            # Process the text
            chunks = self.document_processor.chunk_text(text)
            
            if not chunks:
                logger.warning("No chunks generated from text")
                return False, 0
            
            logger.info(f"Generated {len(chunks)} chunks from text")
            
            # Process chunks in batches
            return self._process_chunks(chunks, metadata, collection_name)
        except Exception as e:
            logger.error(f"Error adding text: {str(e)}")
            logger.debug(traceback.format_exc())
            return False, 0
    
    def _process_chunks(self, 
                       chunks: List[str], 
                       metadata: Dict[str, Any],
                       collection_name: str) -> Tuple[bool, int]:
        """
        Process and add chunks to the vector store with optimized batch processing.
        
        Args:
            chunks: List of text chunks
            metadata: Metadata to associate with the chunks
            collection_name: Collection name
            
        Returns:
            Tuple[bool, int]: (Success status, Number of chunks added)
        """
        from qdrant_client.http import models
        
        try:
            # Track the timestamp for versioning
            timestamp = self.version_manager.get_timestamp()
            version_date = self.version_manager.format_timestamp(timestamp)
            logger.info(f"Creating version {version_date} (timestamp: {timestamp})")
            
            total_chunks = len(chunks)
            total_added = 0
            all_points = []
            
            # Process chunks in smaller batches for embedding generation
            for i in range(0, len(chunks), MAX_EMBEDDING_BATCH_SIZE):
                batch = chunks[i:i+MAX_EMBEDDING_BATCH_SIZE]
                batch_num = i // MAX_EMBEDDING_BATCH_SIZE + 1
                total_batches = (len(chunks) - 1) // MAX_EMBEDDING_BATCH_SIZE + 1
                
                logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} chunks)")
                
                try:
                    # Generate embeddings for the batch
                    embeddings = get_embeddings(batch)
                    
                    if len(embeddings) != len(batch):
                        logger.warning(f"Embedding count mismatch: got {len(embeddings)}, expected {len(batch)}")
                        continue
                    
                    # Create points for the batch
                    batch_points = []
                    for j, (text, embedding) in enumerate(zip(batch, embeddings)):
                        chunk_index = i + j
                        versioned_id = self.version_manager.get_versioned_id(
                            base_id=metadata.get("path", "text"),
                            chunk_index=chunk_index,
                            timestamp=timestamp
                        )
                        
                        point = models.PointStruct(
                            id=versioned_id,
                            vector=embedding,
                            payload={
                                "text": text,
                                "metadata": metadata,
                                "timestamp": timestamp,
                                "version_date": version_date,
                                "chunk_index": chunk_index,
                                "total_chunks": total_chunks
                            }
                        )
                        batch_points.append(point)
                    
                    all_points.extend(batch_points)
                    total_added += len(batch_points)
                    logger.info(f"Created {len(batch_points)} points for batch {batch_num}")
                
                except EmbeddingError as e:
                    logger.error(f"Error generating embeddings for batch {batch_num}: {str(e)}")
                    continue
                except Exception as e:
                    logger.error(f"Error processing batch {batch_num}: {str(e)}")
                    logger.debug(traceback.format_exc())
                    continue
            
            if not all_points:
                logger.error("No valid points created, aborting add operation")
                return False, 0
            
            # Upload all generated points
            logger.info(f"Uploading {len(all_points)} points to collection '{collection_name}'")
            success = self.vector_store.add_points(all_points, collection_name)
            
            if success:
                logger.info(f"Successfully added {total_added}/{total_chunks} chunks to collection '{collection_name}'")
                return True, total_added
            else:
                logger.error(f"Failed to add points to collection '{collection_name}'")
                return False, 0
        
        except Exception as e:
            logger.error(f"Error processing chunks: {str(e)}")
            logger.debug(traceback.format_exc())
            return False, 0
    
    def add_directory(self, 
                      directory: str, 
                      metadata: Optional[Dict[str, Any]] = None,
                      extensions: Optional[List[str]] = None,
                      collection_name: Optional[str] = None) -> Tuple[bool, int]:
        """
        Add all files in a directory to the knowledge base.
        
        Args:
            directory: Directory path
            metadata: Optional metadata to associate with all documents
            extensions: File extensions to include (e.g. ['.txt', '.md'])
            collection_name: Collection name (defaults to self.collection_name)
            
        Returns:
            Tuple[bool, int]: (Success status, Number of chunks added)
        """
        collection_name = collection_name or self.collection_name
        metadata = metadata or {}
        
        logger.info(f"Adding directory '{directory}' to collection '{collection_name}'")
        
        if not os.path.isdir(directory):
            logger.error(f"Directory not found: {directory}")
            return False, 0
        
        total_chunks = 0
        successful_files = 0
        failed_files = 0
        skipped_files = 0
        
        # Process all files in the directory
        for root, _, files in os.walk(directory):
            for file in files:
                file_path = os.path.join(root, file)
                
                # Check file extension if specified
                if extensions and not any(file.endswith(ext) for ext in extensions):
                    logger.info(f"Skipping file with unsupported extension: {file_path}")
                    skipped_files += 1
                    continue
                
                # Create a copy of the metadata for this specific file
                file_metadata = metadata.copy()
                file_metadata["directory"] = directory
                file_metadata["relative_path"] = os.path.relpath(file_path, directory)
                
                try:
                    success, chunks_added = self.add_document(
                        file_path, 
                        metadata=file_metadata,
                        collection_name=collection_name
                    )
                    
                    if success:
                        logger.info(f"Successfully added file: {file_path} ({chunks_added} chunks)")
                        total_chunks += chunks_added
                        successful_files += 1
                    else:
                        logger.warning(f"Failed to add file: {file_path}")
                        failed_files += 1
                except Exception as e:
                    logger.error(f"Error processing file '{file_path}': {str(e)}")
                    failed_files += 1
        
        logger.info(f"Directory '{directory}' processing complete:")
        logger.info(f"  - Successful files: {successful_files}")
        logger.info(f"  - Failed files: {failed_files}")
        logger.info(f"  - Skipped files: {skipped_files}")
        logger.info(f"  - Total chunks added: {total_chunks}")
        
        return successful_files > 0, total_chunks
    
    def query(self, 
              query_text: str, 
              limit: int = 5,
              filters: Optional[Dict[str, Any]] = None,
              collection_name: Optional[str] = None) -> List[Dict]:
        """
        Query the knowledge base.
        
        Args:
            query_text: Query text
            limit: Maximum number of results
            filters: Optional metadata filters
            collection_name: Collection name (defaults to self.collection_name)
            
        Returns:
            List[Dict]: Query results
        """
        collection_name = collection_name or self.collection_name
        logger.info(f"Querying collection '{collection_name}' with: '{query_text}'")
        
        # Forward the query to the vector store
        results = self.vector_store.query(
            query_text=query_text,
            limit=limit,
            filters=filters,
            latest_only=True,
            collection_name=collection_name
        )
        
        logger.info(f"Query returned {len(results)} results")
        return results
    
    def get_document_versions(self, 
                              path: str,
                              collection_name: Optional[str] = None) -> List[Tuple[int, str]]:
        """
        Get all versions of a document by path.
        
        Args:
            path: Document path
            collection_name: Collection name (defaults to self.collection_name)
            
        Returns:
            List[Tuple[int, str]]: List of (timestamp, formatted_date) tuples
        """
        collection_name = collection_name or self.collection_name
        logger.info(f"Getting versions for document '{path}' in collection '{collection_name}'")
        
        # Forward the request to the vector store
        versions = self.vector_store.get_document_versions(
            path=path,
            collection_name=collection_name
        )
        
        logger.info(f"Found {len(versions)} versions for document '{path}'")
        return versions


# Create default instance
logger.info("Creating default knowledge base instance")
default_knowledge_base = KnowledgeBase() 