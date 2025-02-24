/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PromptService {
  /**
   * Enhance a prompt
   * @returns any Enhanced prompt
   * @throws ApiError
   */
  public static enhancePrompt({
    requestBody,
  }: {
    requestBody: {
      prompt: string;
      options?: {
        temperature?: number;
        maxTokens?: number;
      };
    },
  }): CancelablePromise<{
    enhancedPrompt?: string;
    explanation?: string;
  }> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/prompt/enhance',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Error response`,
        500: `Error response`,
      },
    });
  }
}
