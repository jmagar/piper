/**
 * Safe UUID generation utility with fallback for environments where crypto.randomUUID() is not available
 */

/**
 * Generate a unique identifier with crypto.randomUUID() fallback
 * @returns A UUID string
 */
export function generateUUID(): string {
  // Check if crypto.randomUUID is available (modern browsers, Node.js 16.7.0+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      console.warn('crypto.randomUUID() failed, falling back to manual generation:', error);
    }
  }

  // Fallback implementation for environments without crypto.randomUUID()
  return generateUUIDFallback();
}

/**
 * Fallback UUID generation using Math.random()
 * @returns A UUID-like string
 */
function generateUUIDFallback(): string {
  // Generate UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a shorter unique identifier (8 characters)
 * @returns A short unique string
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Generate a timestamp-based unique identifier
 * @returns A timestamp-based unique string
 */
export function generateTimestampId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
} 