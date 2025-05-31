/**
 * Server-side fetch utility for making API calls with absolute URLs
 * This ensures that server-side fetch calls use the correct base URL
 */

/**
 * Get the base URL for server-side API calls
 * @returns The base URL from environment variables or fallback
 */
export function getServerBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Make a server-side fetch call with an absolute URL
 * This should be used in any Server Action or API route that needs to call other API endpoints
 * 
 * @param path - The relative path (should start with '/')
 * @param options - Fetch options (same as the standard fetch API)
 * @returns Promise with the fetch response
 */
export async function serverFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  // Ensure path starts with '/'
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Get base URL from environment or use fallback
  const baseUrl = getServerBaseUrl();
  
  // Create absolute URL
  const url = `${baseUrl}${normalizedPath}`;
  
  // Make the fetch call with the absolute URL
  return fetch(url, options);
}

/**
 * Make a server-side fetch call and parse the JSON response
 * 
 * @param path - The relative path (should start with '/')
 * @param options - Fetch options (same as the standard fetch API)
 * @returns Promise with the parsed JSON response
 */
export async function serverFetchJson<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await serverFetch(path, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server fetch failed (${response.status}): ${errorText}`);
  }
  
  return response.json() as Promise<T>;
} 