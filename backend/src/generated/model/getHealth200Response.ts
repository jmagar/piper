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

export class GetHealth200Response {
    'status': GetHealth200Response.StatusEnum;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "status",
            "baseName": "status",
            "type": "GetHealth200Response.StatusEnum"
        }    ];

    static getAttributeTypeMap() {
        return GetHealth200Response.attributeTypeMap;
    }
}

export namespace GetHealth200Response {
    export enum StatusEnum {
        Ok = <any> 'ok'
    }
}
