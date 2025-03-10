/**
 * Pooper API
 * API for the Pooper chat application. Provides endpoints for chat, MCP, tools, analytics, realtime, config, prompt, and preview services. 
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { RequestFile } from './models';
import { ApiMcpHealthGet200ResponseMemoryUsage } from './apiMcpHealthGet200ResponseMemoryUsage';

export class ApiMcpHealthGet200Response {
    'status'?: string;
    'version'?: string;
    'uptime'?: number;
    'memoryUsage'?: ApiMcpHealthGet200ResponseMemoryUsage;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "status",
            "baseName": "status",
            "type": "string"
        },
        {
            "name": "version",
            "baseName": "version",
            "type": "string"
        },
        {
            "name": "uptime",
            "baseName": "uptime",
            "type": "number"
        },
        {
            "name": "memoryUsage",
            "baseName": "memoryUsage",
            "type": "ApiMcpHealthGet200ResponseMemoryUsage"
        }    ];

    static getAttributeTypeMap() {
        return ApiMcpHealthGet200Response.attributeTypeMap;
    }
}

