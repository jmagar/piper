import createDOMPurify from "dompurify"
import { JSDOM } from "jsdom"

const window = new JSDOM("").window
const DOMPurify = createDOMPurify(window)

/**
 * Enhanced user input sanitization for database safety
 * Handles null bytes, control characters, and PostgreSQL-unsafe content
 * This prevents database constraint violations that cause "An error occurred" messages
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  try {
    // Step 1: Remove null bytes and control characters that cause PostgreSQL errors
    let sanitized = input
      .replace(/\0/g, '') // Remove null bytes (main cause of database errors)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters except tab, LF, CR
      .replace(/[\uFFFE\uFFFF]/g, '') // Remove invalid Unicode characters
      .replace(/[\uD800-\uDFFF]/g, ''); // Remove unpaired surrogates

    // Step 2: Handle malformed UTF-8 sequences
    try {
      const buffer = Buffer.from(sanitized, 'utf8');
      sanitized = buffer.toString('utf8');
    } catch {
      // If UTF-8 conversion fails, remove problematic characters
      sanitized = sanitized.replace(/[\uFFFD]/g, ''); // Remove replacement characters
    }

    // Step 3: Apply DOMPurify for HTML/XSS sanitization
    sanitized = DOMPurify.sanitize(sanitized);

    // Step 4: Final validation and normalization
    try {
      sanitized = sanitized.normalize('NFC'); // Canonical composition
    } catch {
      // If normalization fails, continue with non-normalized string
    }

    return sanitized.trim();

  } catch (error) {
    console.error('Error in sanitizeUserInput:', error);
    // Return empty string if sanitization completely fails
    return '';
  }
}
