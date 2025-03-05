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
import { Activity } from './activity';

export class ApiDashboardActivityGet200Response {
    'activities'?: Array<Activity>;
    /**
    * Total number of activities matching the filters
    */
    'count'?: number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "activities",
            "baseName": "activities",
            "type": "Array<Activity>"
        },
        {
            "name": "count",
            "baseName": "count",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return ApiDashboardActivityGet200Response.attributeTypeMap;
    }
}

