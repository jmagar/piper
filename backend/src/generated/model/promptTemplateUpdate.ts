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

export class PromptTemplateUpdate {
    /**
    * Title of the prompt template
    */
    'title'?: string;
    /**
    * Description of what the prompt template does
    */
    'description'?: string;
    /**
    * The actual prompt template content with placeholders
    */
    'content'?: string;
    /**
    * Category of the prompt template
    */
    'category'?: string;
    /**
    * Tags for organizing and filtering prompt templates
    */
    'tags'?: Array<string>;
    /**
    * Whether the prompt is public or private
    */
    'isPublic'?: boolean;
    /**
    * Whether the prompt has been favorited by the user
    */
    'isFavorited'?: boolean;

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
            "name": "content",
            "baseName": "content",
            "type": "string"
        },
        {
            "name": "category",
            "baseName": "category",
            "type": "string"
        },
        {
            "name": "tags",
            "baseName": "tags",
            "type": "Array<string>"
        },
        {
            "name": "isPublic",
            "baseName": "isPublic",
            "type": "boolean"
        },
        {
            "name": "isFavorited",
            "baseName": "isFavorited",
            "type": "boolean"
        }    ];

    static getAttributeTypeMap() {
        return PromptTemplateUpdate.attributeTypeMap;
    }
}

