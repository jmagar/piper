/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PreviewService {
  /**
   * Get link preview
   * @returns any Link preview
   * @throws ApiError
   */
  public static getLinkPreview({
    requestBody,
  }: {
    requestBody: {
      url: string;
    },
  }): CancelablePromise<{
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    siteName?: string;
  }> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/preview/link',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Error response`,
        500: `Error response`,
      },
    });
  }
}
