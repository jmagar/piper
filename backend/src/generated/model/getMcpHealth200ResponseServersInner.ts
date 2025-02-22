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
import { GetMcpHealth200ResponseServersInnerMemoryUsage } from './getMcpHealth200ResponseServersInnerMemoryUsage';

export class GetMcpHealth200ResponseServersInner {
    'name'?: string;
    'status'?: GetMcpHealth200ResponseServersInner.StatusEnum;
    'error'?: string;
    'memoryUsage'?: GetMcpHealth200ResponseServersInnerMemoryUsage;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "status",
            "baseName": "status",
            "type": "GetMcpHealth200ResponseServersInner.StatusEnum"
        },
        {
            "name": "error",
            "baseName": "error",
            "type": "string"
        },
        {
            "name": "memoryUsage",
            "baseName": "memoryUsage",
            "type": "GetMcpHealth200ResponseServersInnerMemoryUsage"
        }    ];

    static getAttributeTypeMap() {
        return GetMcpHealth200ResponseServersInner.attributeTypeMap;
    }
}

export namespace GetMcpHealth200ResponseServersInner {
    export enum StatusEnum {
        Ok = <any> 'ok',
        Error = <any> 'error'
    }
}
