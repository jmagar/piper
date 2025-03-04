/**
 * Error thrown when validation fails
 */
export class ValidationError extends Error {
  statusCode = 400;

  /**
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
} 