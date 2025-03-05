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
import { KnowledgeSearchResultMetadata } from './knowledgeSearchResultMetadata';

export class KnowledgeSearchResult {
    /**
    * Unique identifier for the document
    */
    'id'?: string;
    /**
    * Similarity score (0.0-1.0)
    */
    'score'?: number;
    /**
    * Document content snippet
    */
    'content'?: string;
    'metadata'?: KnowledgeSearchResultMetadata;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "string"
        },
        {
            "name": "score",
            "baseName": "score",
            "type": "number"
        },
        {
            "name": "content",
            "baseName": "content",
            "type": "string"
        },
        {
            "name": "metadata",
            "baseName": "metadata",
            "type": "KnowledgeSearchResultMetadata"
        }    ];

    static getAttributeTypeMap() {
        return KnowledgeSearchResult.attributeTypeMap;
    }
}

