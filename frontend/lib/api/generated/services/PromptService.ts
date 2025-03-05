/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PromptService {
  /**
   * Enhance prompt
   * Enhance a user prompt
   * @returns any Prompt enhanced successfully
   * @throws ApiError
   */
  public static postApiPromptEnhance({
    requestBody,
  }: {
    requestBody: {
      prompt: string;
      options?: Record<string, any>;
    },
  }): CancelablePromise<{
    enhancedPrompt?: string;
  }> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/prompt/enhance',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
}
