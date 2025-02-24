/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class PreviewService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get link preview
     * @param requestBody
     * @returns any Link preview
     * @throws ApiError
     */
    public getLinkPreview(
        requestBody: {
            url: string;
        },
    ): CancelablePromise<{
        title?: string;
        description?: string;
        image?: string;
        favicon?: string;
        siteName?: string;
    }> {
        return this.httpRequest.request({
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
