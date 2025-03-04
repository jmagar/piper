/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends Error {
  statusCode = 404;

  /**
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
} 