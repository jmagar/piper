/**
 * Connection Testing Utilities
 * 
 * Provides functions to test connectivity to backend services
 */

/**
 * Test result interface
 */
export interface ConnectionTestResult {
  success: boolean;
  service: string;
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * Test connection to Qdrant vector database
 */
export async function testQdrantConnection(): Promise<ConnectionTestResult> {
  try {
    const response = await fetch('/api/system/test-qdrant', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        service: 'Qdrant',
        message: 'Failed to connect to Qdrant',
        details: errorData,
        timestamp: new Date(),
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      service: 'Qdrant',
      message: 'Successfully connected to Qdrant',
      details: data,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      service: 'Qdrant',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error,
      timestamp: new Date(),
    };
  }
}

/**
 * Test connection to OpenAI API (for embeddings)
 */
export async function testOpenAIConnection(): Promise<ConnectionTestResult> {
  try {
    const response = await fetch('/api/system/test-openai', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        service: 'OpenAI',
        message: 'Failed to connect to OpenAI API',
        details: errorData,
        timestamp: new Date(),
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      service: 'OpenAI',
      message: 'Successfully connected to OpenAI API',
      details: data,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      service: 'OpenAI',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error,
      timestamp: new Date(),
    };
  }
}

/**
 * Test all connections
 */
export async function testAllConnections(): Promise<ConnectionTestResult[]> {
  const results = await Promise.all([
    testQdrantConnection(),
    testOpenAIConnection(),
  ]);
  
  return results;
} 