"""
Embeddings Module
================

Handles generating embeddings using OpenAI's API.
"""

import time
import logging
import random
from typing import List, Dict, Any, Optional
import openai
from openai import OpenAIError, RateLimitError, APITimeoutError, APIConnectionError

from kb_modules.config import EMBEDDING_MODEL, get_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('embeddings')


class EmbeddingError(Exception):
    """Exception raised for errors in embedding generation."""
    pass


class EmbeddingGenerator:
    """Handles generating embeddings using OpenAI's API."""
    
    def __init__(self, api_key: str = None, model: str = None, max_retries: int = 5):
        """
        Initialize the embedding generator.
        
        Args:
            api_key: OpenAI API key (optional, will use config if not provided)
            model: Embedding model name (optional, will use config if not provided)
            max_retries: Maximum number of retries for API calls
        """
        config = get_config()
        self.api_key = api_key or config["openai_api_key"]
        self.model = model or config["embedding_model"]
        self.max_retries = max_retries
        
        # Set the API key for OpenAI client
        openai.api_key = self.api_key
        logger.info(f"Initialized embedding generator with model: {self.model}")
    
    def get_embedding(self, text: str) -> List[float]:
        """
        Generate an embedding for the provided text with retry logic.
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            List[float]: The embedding vector
            
        Raises:
            Exception: If embedding generation fails after all retries
        """
        if not text.strip():
            logger.warning("Empty text provided for embedding")
            # Return a zero vector of appropriate dimension
            config = get_config()
            return [0.0] * config["embedding_dimensions"]
        
        # Clean and prepare text
        cleaned_text = text.replace("\n", " ")
        
        # Respect token limit (8191 for text-embedding-3-large)
        truncated_text = cleaned_text[:8191]
        logger.debug(f"Generating embedding for text ({len(truncated_text)} chars)")
        
        # Try with exponential backoff
        for attempt in range(self.max_retries):
            try:
                # Initial rate limiting precaution
                time.sleep(0.1)
                
                # Generate embedding
                response = openai.embeddings.create(
                    model=self.model,
                    input=truncated_text
                )
                
                logger.debug(f"Successfully generated embedding on attempt {attempt + 1}")
                return response.data[0].embedding
                
            except RateLimitError as e:
                wait_time = (2 ** attempt) + random.random()
                logger.warning(f"Rate limit exceeded. Waiting {wait_time:.2f}s (attempt {attempt + 1}/{self.max_retries})")
                time.sleep(wait_time)
                
            except (APITimeoutError, APIConnectionError) as e:
                wait_time = (2 ** attempt) + random.random()
                logger.warning(f"API connection error: {str(e)}. Waiting {wait_time:.2f}s (attempt {attempt + 1}/{self.max_retries})")
                time.sleep(wait_time)
                
            except OpenAIError as e:
                logger.error(f"OpenAI API error: {str(e)}")
                if attempt < self.max_retries - 1:
                    wait_time = (2 ** attempt) + random.random()
                    logger.warning(f"Retrying in {wait_time:.2f}s (attempt {attempt + 1}/{self.max_retries})")
                    time.sleep(wait_time)
                else:
                    logger.error("Max retries exceeded. Raising exception.")
                    raise
                    
            except Exception as e:
                logger.error(f"Unexpected error: {str(e)}")
                raise
        
        # If we get here, all retries failed
        raise EmbeddingError(f"Failed to generate embedding after {self.max_retries} attempts")
    
    def get_embeddings_batch(self, texts: List[str], chunk_size: int = 16) -> List[List[float]]:
        """
        Generate embeddings for a batch of texts with chunking and retry logic.
        
        Args:
            texts: List of texts to generate embeddings for
            chunk_size: Maximum number of texts to embed in a single API call
            
        Returns:
            List[List[float]]: List of embedding vectors
        """
        logger.info(f"Generating embeddings for {len(texts)} texts in batches of {chunk_size}")
        
        # Process in chunks to avoid hitting API limits
        embeddings = []
        
        # Process in smaller chunks
        for i in range(0, len(texts), chunk_size):
            chunk = texts[i:i+chunk_size]
            logger.info(f"Processing batch {i//chunk_size + 1}/{(len(texts)-1)//chunk_size + 1} ({len(chunk)} texts)")
            
            # Clean and prepare texts
            cleaned_texts = [text.replace("\n", " ")[:8191] for text in chunk]
            
            # Try with exponential backoff
            for attempt in range(self.max_retries):
                try:
                    # Rate limiting precaution
                    time.sleep(0.5)
                    
                    # Generate embeddings
                    response = openai.embeddings.create(
                        model=self.model,
                        input=cleaned_texts
                    )
                    
                    batch_embeddings = [item.embedding for item in response.data]
                    embeddings.extend(batch_embeddings)
                    logger.info(f"Successfully generated {len(batch_embeddings)} embeddings")
                    break
                    
                except RateLimitError as e:
                    wait_time = (2 ** attempt) + random.random() * 3
                    logger.warning(f"Rate limit exceeded. Waiting {wait_time:.2f}s (attempt {attempt + 1}/{self.max_retries})")
                    time.sleep(wait_time)
                    
                except (APITimeoutError, APIConnectionError) as e:
                    wait_time = (2 ** attempt) + random.random() * 2
                    logger.warning(f"API connection error: {str(e)}. Waiting {wait_time:.2f}s (attempt {attempt + 1}/{self.max_retries})")
                    time.sleep(wait_time)
                    
                except OpenAIError as e:
                    logger.error(f"OpenAI API error: {str(e)}")
                    if attempt < self.max_retries - 1:
                        wait_time = (2 ** attempt) + random.random()
                        logger.warning(f"Retrying in {wait_time:.2f}s (attempt {attempt + 1}/{self.max_retries})")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"Max retries exceeded for batch starting at index {i}")
                        # Add zero vectors as placeholders for failed embeddings
                        config = get_config()
                        placeholder = [0.0] * config["embedding_dimensions"]
                        for _ in range(len(chunk)):
                            embeddings.append(placeholder)
                            
                except Exception as e:
                    logger.error(f"Unexpected error in batch starting at index {i}: {str(e)}")
                    # Add zero vectors as placeholders for failed embeddings
                    config = get_config()
                    placeholder = [0.0] * config["embedding_dimensions"]
                    for _ in range(len(chunk)):
                        embeddings.append(placeholder)
                    break
        
        return embeddings


# Create a default instance for easy import
logger.info("Creating default embedding generator")
default_embedding_generator = EmbeddingGenerator()


def get_embedding(text: str) -> List[float]:
    """
    Convenience function to get an embedding using the default generator.
    
    Args:
        text: Text to generate embedding for
        
    Returns:
        List[float]: The embedding vector
    """
    try:
        return default_embedding_generator.get_embedding(text)
    except Exception as e:
        logger.error(f"Error in get_embedding: {str(e)}")
        # Return a zero vector as fallback
        config = get_config()
        return [0.0] * config["embedding_dimensions"]


def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Convenience function to get embeddings for multiple texts using the default generator.
    
    Args:
        texts: List of texts to generate embeddings for
        
    Returns:
        List[List[float]]: List of embedding vectors
    """
    try:
        return default_embedding_generator.get_embeddings_batch(texts)
    except Exception as e:
        logger.error(f"Error in get_embeddings: {str(e)}")
        # Return zero vectors as fallback
        config = get_config()
        return [[0.0] * config["embedding_dimensions"] for _ in texts] 