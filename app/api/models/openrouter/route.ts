import { NextResponse } from 'next/server';
import { redisCacheManager } from '../../../lib/mcp/modules/redis-cache-manager';

export const dynamic = 'force-dynamic'; // Ensures the route is re-evaluated on each request

const OPENROUTER_MODELS_API_URL = 'https://openrouter.ai/api/v1/models';

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
  context_length: number | null;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
  top_provider: {
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  per_request_limits: unknown | null; // Adjust if specific structure is known
}

// Define the structure of the entire API response from OpenRouter
interface OpenRouterApiResponse {
  data: OpenRouterModel[];
}

interface SimplifiedModel {
  id: string;
  name: string;
  description: string;
  context_length: number | null;
  providerId: string;
}

export async function GET() {
  try {
    // ✅ Check cache first - 90%+ cache hit rate expected
    const cachedModels = await redisCacheManager.getCachedOpenRouterModels();
    if (cachedModels) {
      return NextResponse.json(cachedModels);
    }

    // Cache miss - fetch from OpenRouter API
    const response = await fetch(OPENROUTER_MODELS_API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to fetch models from OpenRouter:', response.status, errorData);
      return NextResponse.json(
        { error: `Failed to fetch models from OpenRouter: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data: OpenRouterApiResponse = await response.json();

    const simplifiedModels: SimplifiedModel[] = data.data.map(model => {
      let providerId = 'unknown';
      const parts = model.id.split('/');
      if (parts.length > 1) {
        providerId = parts[0];
      }
      return {
        id: model.id,
        name: model.name,
        description: model.description,
        context_length: model.context_length,
        providerId: providerId,
      };
    });

    // ✅ Cache the result for 1 hour
    await redisCacheManager.setCachedOpenRouterModels(simplifiedModels, 3600);

    return NextResponse.json(simplifiedModels);

  } catch (error) {
    console.error('Error fetching or processing OpenRouter models:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal server error while fetching models', details: errorMessage },
      { status: 500 }
    );
  }
}
