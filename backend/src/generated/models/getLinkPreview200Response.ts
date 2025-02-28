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

export class GetLinkPreview200Response {
    'title'?: string;
    'description'?: string;
    'image'?: string;
    'favicon'?: string;
    'siteName'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "title",
            "baseName": "title",
            "type": "string"
        },
        {
            "name": "description",
            "baseName": "description",
            "type": "string"
        },
        {
            "name": "image",
            "baseName": "image",
            "type": "string"
        },
        {
            "name": "favicon",
            "baseName": "favicon",
            "type": "string"
        },
        {
            "name": "siteName",
            "baseName": "siteName",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return GetLinkPreview200Response.attributeTypeMap;
    }
}

