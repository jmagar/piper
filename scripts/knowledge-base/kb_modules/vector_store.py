"""
Vector Store Module
=================

Handles vector database operations using Qdrant.
"""

import time
import logging
import traceback
from typing import Dict, List, Any, Optional, Tuple, Union

from qdrant_client import QdrantClient
from qdrant_client.http import models

# Custom exceptions to handle different Qdrant client versions
class QdrantException(Exception):
    """Custom exception for Qdrant errors."""
    pass

class UnexpectedResponse(Exception):
    """Custom exception for unexpected responses from Qdrant."""
    pass

from kb_modules.config import get_config, DEFAULT_COLLECTION_NAME, EMBEDDING_DIMENSIONS
from kb_modules.embeddings import get_embedding
from kb_modules.versioning import format_timestamp

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('vector_store')

# Maximum batch size for uploads
MAX_BATCH_SIZE = 100
# Maximum retry attempts
MAX_RETRIES = 3


class VectorStore:
    """Handles vector database operations using Qdrant."""
    
    def __init__(self, url: Optional[str] = None, api_key: Optional[str] = None):
        """
        Initialize vector store.
        
        Args:
            url: Qdrant URL
            api_key: Qdrant API key
        """
        config = get_config()
        self.url = url or config["qdrant_url"]
        self.api_key = api_key or config["qdrant_api_key"]
        
        logger.info(f"Initializing Qdrant client with URL: {self.url}")
        self.client = QdrantClient(url=self.url, api_key=self.api_key)
    
    def list_collections(self) -> List[str]:
        """
        List all collections in the database.
        
        Returns:
            List[str]: Collection names
        """
        try:
            logger.info("Listing collections")
            collections = self.client.get_collections()
            collection_names = [collection.name for collection in collections.collections]
            logger.info(f"Found {len(collection_names)} collections")
            return collection_names
        except Exception as e:
            logger.error(f"Error listing collections: {str(e)}")
            return []
    
    def create_collection(self, name: str, force: bool = False) -> bool:
        """
        Create a collection in the database.
        
        Args:
            name: Collection name
            force: If True, recreate collection if it exists
            
        Returns:
            bool: True if successfully created
        """
        try:
            if force:
                try:
                    logger.info(f"Force option enabled, deleting collection '{name}' if it exists")
                    self.client.delete_collection(name)
                    logger.info(f"Deleted existing collection '{name}'")
                except Exception as e:
                    logger.warning(f"Error deleting collection (may not exist): {str(e)}")
            
            logger.info(f"Creating collection '{name}'")
            self.client.create_collection(
                collection_name=name,
                vectors_config=models.VectorParams(
                    size=EMBEDDING_DIMENSIONS,
                    distance=models.Distance.COSINE
                )
            )
            logger.info(f"Collection '{name}' created successfully")
            
            # Create payload indexes for efficient filtering
            logger.info("Creating payload indexes for filtering")
            try:
                self.client.create_payload_index(
                    collection_name=name,
                    field_name="metadata.type",
                    field_schema=models.PayloadSchemaType.KEYWORD
                )
                
                self.client.create_payload_index(
                    collection_name=name,
                    field_name="metadata.path",
                    field_schema=models.PayloadSchemaType.KEYWORD
                )
                
                self.client.create_payload_index(
                    collection_name=name,
                    field_name="timestamp",
                    field_schema=models.PayloadSchemaType.INTEGER
                )
                
                logger.info("Created payload indexes for filtering")
            except Exception as e:
                logger.error(f"Error creating payload indexes: {str(e)}")
                # Continue despite index creation failures
            
            return True
        except UnexpectedResponse as e:
            if "already exists" in str(e):
                logger.info(f"Collection '{name}' already exists")
                return True
            else:
                logger.error(f"Error creating collection: {str(e)}")
                return False
        except Exception as e:
            logger.error(f"Error creating collection: {str(e)}")
            logger.debug(traceback.format_exc())
            return False
    
    def add_points(self, points: List[models.PointStruct], 
                   collection_name: str = DEFAULT_COLLECTION_NAME) -> bool:
        """
        Add points to the database with retry logic and batching.
        
        Args:
            points: List of points to add
            collection_name: Collection name
            
        Returns:
            bool: True if successfully added
        """
        if not points:
            logger.warning("No points to add")
            return True
            
        try:
            # Upload to Qdrant in smaller batches
            batch_size = min(MAX_BATCH_SIZE, len(points))
            successful_batches = 0
            total_batches = (len(points) - 1) // batch_size + 1
            
            logger.info(f"Adding {len(points)} points to collection '{collection_name}' in {total_batches} batches of {batch_size}")
            
            for i in range(0, len(points), batch_size):
                batch = points[i:i+batch_size]
                batch_num = i // batch_size + 1
                
                # Try with retries
                for attempt in range(MAX_RETRIES):
                    try:
                        logger.info(f"Uploading batch {batch_num}/{total_batches} (attempt {attempt+1}/{MAX_RETRIES})")
                        self.client.upsert(
                            collection_name=collection_name,
                            points=batch
                        )
                        logger.info(f"Successfully uploaded batch {batch_num}/{total_batches}")
                        successful_batches += 1
                        break
                    except QdrantException as e:
                        logger.error(f"Qdrant error on batch {batch_num}: {str(e)}")
                        if attempt < MAX_RETRIES - 1:
                            wait_time = 2 ** attempt
                            logger.info(f"Retrying in {wait_time} seconds...")
                            time.sleep(wait_time)
                        else:
                            logger.error(f"Failed to upload batch {batch_num} after {MAX_RETRIES} attempts")
                            return False
                    except Exception as e:
                        logger.error(f"Unexpected error on batch {batch_num}: {str(e)}")
                        if attempt < MAX_RETRIES - 1:
                            wait_time = 2 ** attempt
                            logger.info(f"Retrying in {wait_time} seconds...")
                            time.sleep(wait_time)
                        else:
                            logger.error(f"Failed to upload batch {batch_num} after {MAX_RETRIES} attempts")
                            return False
            
            logger.info(f"Upload complete: {successful_batches}/{total_batches} batches successful")
            return successful_batches == total_batches
        except Exception as e:
            logger.error(f"Error adding points: {str(e)}")
            logger.debug(traceback.format_exc())
            return False
    
    def query(self, query_text: str, limit: int = 5, 
              filters: Optional[Dict[str, Any]] = None, 
              latest_only: bool = True,
              collection_name: str = DEFAULT_COLLECTION_NAME) -> List[Dict]:
        """
        Query the vector database.
        
        Args:
            query_text: Query text
            limit: Maximum number of results
            filters: Optional metadata filters
            latest_only: If True, only return latest version of each document
            collection_name: Collection name
            
        Returns:
            List[Dict]: Query results
        """
        try:
            logger.info(f"Querying collection '{collection_name}' with: '{query_text}' (limit={limit})")
            
            # Generate embedding for query
            try:
                query_embedding = get_embedding(query_text)
            except Exception as e:
                logger.error(f"Error generating embedding for query: {str(e)}")
                return []
            
            # Prepare filter conditions
            filter_conditions = []
            
            # Add metadata filters if provided
            if filters:
                logger.info(f"Applying filters: {filters}")
                for key, value in filters.items():
                    filter_conditions.append(
                        models.FieldCondition(
                            key=f"metadata.{key}",
                            match=models.MatchValue(value=value)
                        )
                    )
            
            # Prepare filter
            filter_query = None
            if filter_conditions:
                filter_query = models.Filter(must=list(filter_conditions))
            
            # Search Qdrant
            logger.debug(f"Searching with filter: {filter_query}")
            search_result = self.client.search(
                collection_name=collection_name,
                query_vector=query_embedding,
                limit=limit if not latest_only else limit * 3,  # Get more results to account for filtering
                query_filter=filter_query,
                with_payload=True,
                score_threshold=0.5  # Only return reasonable matches
            )
            
            logger.info(f"Found {len(search_result)} initial results")
            
            # Post-process results for latest_only
            if latest_only:
                logger.info("Filtering to latest version only")
                # Group by path
                path_groups: Dict[str, Tuple[models.ScoredPoint, float]] = {}
                for hit in search_result:
                    if hit.payload is None:
                        continue
                        
                    metadata = hit.payload.get("metadata", {})
                    path = metadata.get("path", "unknown") if metadata is not None else "unknown"
                    timestamp = hit.payload.get("timestamp", 0)
                    
                    # Check if path exists in path_groups first
                    if path not in path_groups:
                        path_groups[path] = (hit, hit.score)
                    else:
                        # Then safely check the timestamp
                        existing_hit, existing_score = path_groups[path]
                        existing_payload = existing_hit.payload
                        existing_timestamp = 0
                        if existing_payload is not None:
                            existing_timestamp = existing_payload.get("timestamp", 0)
                        
                        if timestamp > existing_timestamp:
                            path_groups[path] = (hit, hit.score)
                
                # Sort by score and take top 'limit' results
                results_by_score = sorted(path_groups.values(), key=lambda x: x[1], reverse=True)[:limit]
                search_result = [item[0] for item in results_by_score]
                logger.info(f"Filtered to {len(search_result)} results after latest-only filter")
            
            # Format results
            results = []
            for hit in search_result:
                if hit.payload is None:
                    # Skip points with no payload
                    continue
                    
                metadata = hit.payload.get("metadata", {})
                result = {
                    "text": hit.payload.get("text", ""),
                    "metadata": metadata,
                    "score": hit.score,
                    "timestamp": hit.payload.get("timestamp"),
                    "version_date": hit.payload.get("version_date"),
                    "chunk_index": hit.payload.get("chunk_index"),
                    "total_chunks": hit.payload.get("total_chunks")
                }
                results.append(result)
            
            return results
        except Exception as e:
            logger.error(f"Error querying knowledge base: {str(e)}")
            logger.debug(traceback.format_exc())
            return []
    
    def get_document_versions(self, path: str, 
                              collection_name: str = DEFAULT_COLLECTION_NAME) -> List[Tuple[int, str]]:
        """
        Get all versions of a document by path.
        
        Args:
            path: Document path
            collection_name: Collection name
            
        Returns:
            List[Tuple[int, str]]: List of (timestamp, formatted_date) tuples
        """
        try:
            logger.info(f"Getting versions for document: {path} in collection '{collection_name}'")
            
            # Search for all documents with the given path
            filter_query = models.Filter(
                must=[
                    models.FieldCondition(
                        key="metadata.path",
                        match=models.MatchValue(value=path)
                    )
                ]
            )
            
            # Only need one chunk per version, use scroll to get all versions
            scroll_results = self.client.scroll(
                collection_name=collection_name,
                scroll_filter=filter_query,
                limit=100,
                with_payload=True,
                with_vectors=False
            )
            
            points = scroll_results[0]
            logger.info(f"Found {len(points)} chunks for document {path}")
            
            # Extract unique timestamps/versions
            versions = {}
            for point in points:
                if point.payload is None:
                    continue
                    
                timestamp = point.payload.get("timestamp")
                if timestamp and point.payload.get("chunk_index", 0) == 0:  # Only consider first chunks
                    versions[timestamp] = point.payload.get("version_date", format_timestamp(timestamp))
            
            # Sort by timestamp (newest first)
            sorted_versions = sorted(versions.items(), reverse=True)
            logger.info(f"Found {len(sorted_versions)} unique versions for document {path}")
            return sorted_versions
        except Exception as e:
            logger.error(f"Error retrieving document versions: {str(e)}")
            logger.debug(traceback.format_exc())
            return []


# Create default instance
logger.info("Creating default vector store instance")
default_vector_store = VectorStore() 