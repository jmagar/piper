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

export class SendEventRequest {
    'type': string;
    'data': { [key: string]: any | undefined; };
    /**
    * Target user ID, if not specified broadcast to all
    */
    'target'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "type",
            "baseName": "type",
            "type": "string"
        },
        {
            "name": "data",
            "baseName": "data",
            "type": "{ [key: string]: any | undefined; }"
        },
        {
            "name": "target",
            "baseName": "target",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return SendEventRequest.attributeTypeMap;
    }
}

