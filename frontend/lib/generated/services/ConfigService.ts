/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ConfigService {
  /**
   * Get server configuration
   * @returns any Server configuration
   * @throws ApiError
   */
  public static getConfig(): CancelablePromise<{
    version?: string;
    features?: Record<string, boolean>;
    limits?: {
      maxMessageLength?: number;
      maxFileSize?: number;
      maxFilesPerMessage?: number;
    };
    providers?: {
      openai?: boolean;
      anthropic?: boolean;
      groq?: boolean;
    };
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/config',
      errors: {
        500: `Error response`,
      },
    });
  }
  /**
   * Update server configuration
   * @returns any Configuration updated
   * @throws ApiError
   */
  public static updateConfig({
    requestBody,
  }: {
    requestBody: {
      features?: Record<string, boolean>;
      limits?: {
        maxMessageLength?: number;
        maxFileSize?: number;
        maxFilesPerMessage?: number;
      };
      providers?: {
        openai?: boolean;
        anthropic?: boolean;
        groq?: boolean;
      };
    },
  }): CancelablePromise<{
    success?: boolean;
  }> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/config',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Error response`,
        500: `Error response`,
      },
    });
  }
}
