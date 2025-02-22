/**
 * Pooper API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { RequestFile } from './models';
import { GetToolExecutions200ResponseExecutionsInner } from './getToolExecutions200ResponseExecutionsInner';

export class GetToolExecutions200Response {
    'executions'?: Array<GetToolExecutions200ResponseExecutionsInner>;
    'nextCursor'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "executions",
            "baseName": "executions",
            "type": "Array<GetToolExecutions200ResponseExecutionsInner>"
        },
        {
            "name": "nextCursor",
            "baseName": "nextCursor",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return GetToolExecutions200Response.attributeTypeMap;
    }
}

