import localVarRequest from 'request';

export * from './apiError';
export * from './chatMessage';
export * from './chatMessageMetadata';
export * from './chatMessageMetadataToolUsed';
export * from './conversation';
export * from './conversationStats';
export * from './createMessageRequest';
export * from './enhancePrompt200Response';
export * from './enhancePromptRequest';
export * from './getChatStats200Response';
export * from './getConfig200Response';
export * from './getConfig200ResponseModelsInner';
export * from './getEvents200ResponseInner';
export * from './getHealth200Response';
export * from './getLinkPreview200Response';
export * from './getLinkPreviewRequest';
export * from './getMcpHealth200Response';
export * from './getMcpHealth200ResponseServersInner';
export * from './getMcpHealth200ResponseServersInnerMemoryUsage';
export * from './getMcpHealth500Response';
export * from './getMessages200Response';
export * from './getMessages500Response';
export * from './getServerStats200Response';
export * from './getServerStats200ResponseCpuUsage';
export * from './getServerStats200ResponseLastError';
export * from './getServerStats200ResponseMemoryUsage';
export * from './getToolExecutions200Response';
export * from './getToolExecutions200ResponseExecutionsInner';
export * from './getToolExecutions200ResponseExecutionsInnerError';
export * from './getUsage200Response';
export * from './getUsage200ResponseCostBreakdown';
export * from './getUsage200ResponseTimeSeriesDataInner';
export * from './getUsage200ResponseTotalTokens';
export * from './messageReaction';
export * from './messageReactionUsersInner';
export * from './registerMcpToolRequest';
export * from './registerMcpToolRequestParametersInner';
export * from './starMessageRequest';
export * from './starredMessage';
export * from './tool';
export * from './unstarMessageRequest';
export * from './userStats';

import * as fs from 'fs';

export interface RequestDetailedFile {
    value: Buffer;
    options?: {
        filename?: string;
        contentType?: string;
    }
}

export type RequestFile = string | Buffer | fs.ReadStream | RequestDetailedFile;


import { ApiError } from './apiError';
import { ChatMessage } from './chatMessage';
import { ChatMessageMetadata } from './chatMessageMetadata';
import { ChatMessageMetadataToolUsed } from './chatMessageMetadataToolUsed';
import { Conversation } from './conversation';
import { ConversationStats } from './conversationStats';
import { CreateMessageRequest } from './createMessageRequest';
import { EnhancePrompt200Response } from './enhancePrompt200Response';
import { EnhancePromptRequest } from './enhancePromptRequest';
import { GetChatStats200Response } from './getChatStats200Response';
import { GetConfig200Response } from './getConfig200Response';
import { GetConfig200ResponseModelsInner } from './getConfig200ResponseModelsInner';
import { GetEvents200ResponseInner } from './getEvents200ResponseInner';
import { GetHealth200Response } from './getHealth200Response';
import { GetLinkPreview200Response } from './getLinkPreview200Response';
import { GetLinkPreviewRequest } from './getLinkPreviewRequest';
import { GetMcpHealth200Response } from './getMcpHealth200Response';
import { GetMcpHealth200ResponseServersInner } from './getMcpHealth200ResponseServersInner';
import { GetMcpHealth200ResponseServersInnerMemoryUsage } from './getMcpHealth200ResponseServersInnerMemoryUsage';
import { GetMcpHealth500Response } from './getMcpHealth500Response';
import { GetMessages200Response } from './getMessages200Response';
import { GetMessages500Response } from './getMessages500Response';
import { GetServerStats200Response } from './getServerStats200Response';
import { GetServerStats200ResponseCpuUsage } from './getServerStats200ResponseCpuUsage';
import { GetServerStats200ResponseLastError } from './getServerStats200ResponseLastError';
import { GetServerStats200ResponseMemoryUsage } from './getServerStats200ResponseMemoryUsage';
import { GetToolExecutions200Response } from './getToolExecutions200Response';
import { GetToolExecutions200ResponseExecutionsInner } from './getToolExecutions200ResponseExecutionsInner';
import { GetToolExecutions200ResponseExecutionsInnerError } from './getToolExecutions200ResponseExecutionsInnerError';
import { GetUsage200Response } from './getUsage200Response';
import { GetUsage200ResponseCostBreakdown } from './getUsage200ResponseCostBreakdown';
import { GetUsage200ResponseTimeSeriesDataInner } from './getUsage200ResponseTimeSeriesDataInner';
import { GetUsage200ResponseTotalTokens } from './getUsage200ResponseTotalTokens';
import { MessageReaction } from './messageReaction';
import { MessageReactionUsersInner } from './messageReactionUsersInner';
import { RegisterMcpToolRequest } from './registerMcpToolRequest';
import { RegisterMcpToolRequestParametersInner } from './registerMcpToolRequestParametersInner';
import { StarMessageRequest } from './starMessageRequest';
import { StarredMessage } from './starredMessage';
import { Tool } from './tool';
import { UnstarMessageRequest } from './unstarMessageRequest';
import { UserStats } from './userStats';

/* tslint:disable:no-unused-variable */
let primitives = [
                    "string",
                    "boolean",
                    "double",
                    "integer",
                    "long",
                    "float",
                    "number",
                    "any"
                 ];

let enumsMap: {[index: string]: any} = {
        "ChatMessage.RoleEnum": ChatMessage.RoleEnum,
        "ChatMessage.TypeEnum": ChatMessage.TypeEnum,
        "ChatMessage.StatusEnum": ChatMessage.StatusEnum,
        "CreateMessageRequest.TypeEnum": CreateMessageRequest.TypeEnum,
        "GetEvents200ResponseInner.TypeEnum": GetEvents200ResponseInner.TypeEnum,
        "GetHealth200Response.StatusEnum": GetHealth200Response.StatusEnum,
        "GetMcpHealth200Response.StatusEnum": GetMcpHealth200Response.StatusEnum,
        "GetMcpHealth200ResponseServersInner.StatusEnum": GetMcpHealth200ResponseServersInner.StatusEnum,
        "GetToolExecutions200ResponseExecutionsInner.StatusEnum": GetToolExecutions200ResponseExecutionsInner.StatusEnum,
        "RegisterMcpToolRequest.TypeEnum": RegisterMcpToolRequest.TypeEnum,
        "Tool.TypeEnum": Tool.TypeEnum,
}

let typeMap: {[index: string]: any} = {
    "ApiError": ApiError,
    "ChatMessage": ChatMessage,
    "ChatMessageMetadata": ChatMessageMetadata,
    "ChatMessageMetadataToolUsed": ChatMessageMetadataToolUsed,
    "Conversation": Conversation,
    "ConversationStats": ConversationStats,
    "CreateMessageRequest": CreateMessageRequest,
    "EnhancePrompt200Response": EnhancePrompt200Response,
    "EnhancePromptRequest": EnhancePromptRequest,
    "GetChatStats200Response": GetChatStats200Response,
    "GetConfig200Response": GetConfig200Response,
    "GetConfig200ResponseModelsInner": GetConfig200ResponseModelsInner,
    "GetEvents200ResponseInner": GetEvents200ResponseInner,
    "GetHealth200Response": GetHealth200Response,
    "GetLinkPreview200Response": GetLinkPreview200Response,
    "GetLinkPreviewRequest": GetLinkPreviewRequest,
    "GetMcpHealth200Response": GetMcpHealth200Response,
    "GetMcpHealth200ResponseServersInner": GetMcpHealth200ResponseServersInner,
    "GetMcpHealth200ResponseServersInnerMemoryUsage": GetMcpHealth200ResponseServersInnerMemoryUsage,
    "GetMcpHealth500Response": GetMcpHealth500Response,
    "GetMessages200Response": GetMessages200Response,
    "GetMessages500Response": GetMessages500Response,
    "GetServerStats200Response": GetServerStats200Response,
    "GetServerStats200ResponseCpuUsage": GetServerStats200ResponseCpuUsage,
    "GetServerStats200ResponseLastError": GetServerStats200ResponseLastError,
    "GetServerStats200ResponseMemoryUsage": GetServerStats200ResponseMemoryUsage,
    "GetToolExecutions200Response": GetToolExecutions200Response,
    "GetToolExecutions200ResponseExecutionsInner": GetToolExecutions200ResponseExecutionsInner,
    "GetToolExecutions200ResponseExecutionsInnerError": GetToolExecutions200ResponseExecutionsInnerError,
    "GetUsage200Response": GetUsage200Response,
    "GetUsage200ResponseCostBreakdown": GetUsage200ResponseCostBreakdown,
    "GetUsage200ResponseTimeSeriesDataInner": GetUsage200ResponseTimeSeriesDataInner,
    "GetUsage200ResponseTotalTokens": GetUsage200ResponseTotalTokens,
    "MessageReaction": MessageReaction,
    "MessageReactionUsersInner": MessageReactionUsersInner,
    "RegisterMcpToolRequest": RegisterMcpToolRequest,
    "RegisterMcpToolRequestParametersInner": RegisterMcpToolRequestParametersInner,
    "StarMessageRequest": StarMessageRequest,
    "StarredMessage": StarredMessage,
    "Tool": Tool,
    "UnstarMessageRequest": UnstarMessageRequest,
    "UserStats": UserStats,
}

// Check if a string starts with another string without using es6 features
function startsWith(str: string, match: string): boolean {
    return str.substring(0, match.length) === match;
}

// Check if a string ends with another string without using es6 features
function endsWith(str: string, match: string): boolean {
    return str.length >= match.length && str.substring(str.length - match.length) === match;
}

const nullableSuffix = " | null";
const optionalSuffix = " | undefined";
const arrayPrefix = "Array<";
const arraySuffix = ">";
const mapPrefix = "{ [key: string]: ";
const mapSuffix = "; }";

export class ObjectSerializer {
    public static findCorrectType(data: any, expectedType: string) {
        if (data == undefined) {
            return expectedType;
        } else if (primitives.indexOf(expectedType.toLowerCase()) !== -1) {
            return expectedType;
        } else if (expectedType === "Date") {
            return expectedType;
        } else {
            if (enumsMap[expectedType]) {
                return expectedType;
            }

            if (!typeMap[expectedType]) {
                return expectedType; // w/e we don't know the type
            }

            // Check the discriminator
            let discriminatorProperty = typeMap[expectedType].discriminator;
            if (discriminatorProperty == null) {
                return expectedType; // the type does not have a discriminator. use it.
            } else {
                if (data[discriminatorProperty]) {
                    var discriminatorType = data[discriminatorProperty];
                    if(typeMap[discriminatorType]){
                        return discriminatorType; // use the type given in the discriminator
                    } else {
                        return expectedType; // discriminator did not map to a type
                    }
                } else {
                    return expectedType; // discriminator was not present (or an empty string)
                }
            }
        }
    }

    public static serialize(data: any, type: string): any {
        if (data == undefined) {
            return data;
        } else if (primitives.indexOf(type.toLowerCase()) !== -1) {
            return data;
        } else if (endsWith(type, nullableSuffix)) {
            let subType: string = type.slice(0, -nullableSuffix.length); // Type | null => Type
            return ObjectSerializer.serialize(data, subType);
        } else if (endsWith(type, optionalSuffix)) {
            let subType: string = type.slice(0, -optionalSuffix.length); // Type | undefined => Type
            return ObjectSerializer.serialize(data, subType);
        } else if (startsWith(type, arrayPrefix)) {
            let subType: string = type.slice(arrayPrefix.length, -arraySuffix.length); // Array<Type> => Type
            let transformedData: any[] = [];
            for (let index = 0; index < data.length; index++) {
                let datum = data[index];
                transformedData.push(ObjectSerializer.serialize(datum, subType));
            }
            return transformedData;
        } else if (startsWith(type, mapPrefix)) {
            let subType: string = type.slice(mapPrefix.length, -mapSuffix.length); // { [key: string]: Type; } => Type
            let transformedData: { [key: string]: any } = {};
            for (let key in data) {
                transformedData[key] = ObjectSerializer.serialize(
                    data[key],
                    subType,
                );
            }
            return transformedData;
        } else if (type === "Date") {
            return data.toISOString();
        } else {
            if (enumsMap[type]) {
                return data;
            }
            if (!typeMap[type]) { // in case we dont know the type
                return data;
            }

            // Get the actual type of this object
            type = this.findCorrectType(data, type);

            // get the map for the correct type.
            let attributeTypes = typeMap[type].getAttributeTypeMap();
            let instance: {[index: string]: any} = {};
            for (let index = 0; index < attributeTypes.length; index++) {
                let attributeType = attributeTypes[index];
                instance[attributeType.baseName] = ObjectSerializer.serialize(data[attributeType.name], attributeType.type);
            }
            return instance;
        }
    }

    public static deserialize(data: any, type: string): any {
        // polymorphism may change the actual type.
        type = ObjectSerializer.findCorrectType(data, type);
        if (data == undefined) {
            return data;
        } else if (primitives.indexOf(type.toLowerCase()) !== -1) {
            return data;
        } else if (endsWith(type, nullableSuffix)) {
            let subType: string = type.slice(0, -nullableSuffix.length); // Type | null => Type
            return ObjectSerializer.deserialize(data, subType);
        } else if (endsWith(type, optionalSuffix)) {
            let subType: string = type.slice(0, -optionalSuffix.length); // Type | undefined => Type
            return ObjectSerializer.deserialize(data, subType);
        } else if (startsWith(type, arrayPrefix)) {
            let subType: string = type.slice(arrayPrefix.length, -arraySuffix.length); // Array<Type> => Type
            let transformedData: any[] = [];
            for (let index = 0; index < data.length; index++) {
                let datum = data[index];
                transformedData.push(ObjectSerializer.deserialize(datum, subType));
            }
            return transformedData;
        } else if (startsWith(type, mapPrefix)) {
            let subType: string = type.slice(mapPrefix.length, -mapSuffix.length); // { [key: string]: Type; } => Type
            let transformedData: { [key: string]: any } = {};
            for (let key in data) {
                transformedData[key] = ObjectSerializer.deserialize(
                    data[key],
                    subType,
                );
            }
            return transformedData;
        } else if (type === "Date") {
            return new Date(data);
        } else {
            if (enumsMap[type]) {// is Enum
                return data;
            }

            if (!typeMap[type]) { // dont know the type
                return data;
            }
            let instance = new typeMap[type]();
            let attributeTypes = typeMap[type].getAttributeTypeMap();
            for (let index = 0; index < attributeTypes.length; index++) {
                let attributeType = attributeTypes[index];
                instance[attributeType.name] = ObjectSerializer.deserialize(data[attributeType.baseName], attributeType.type);
            }
            return instance;
        }
    }
}

export interface Authentication {
    /**
    * Apply authentication settings to header and query params.
    */
    applyToRequest(requestOptions: localVarRequest.Options): Promise<void> | void;
}

export class HttpBasicAuth implements Authentication {
    public username: string = '';
    public password: string = '';

    applyToRequest(requestOptions: localVarRequest.Options): void {
        requestOptions.auth = {
            username: this.username, password: this.password
        }
    }
}

export class HttpBearerAuth implements Authentication {
    public accessToken: string | (() => string) = '';

    applyToRequest(requestOptions: localVarRequest.Options): void {
        if (requestOptions && requestOptions.headers) {
            const accessToken = typeof this.accessToken === 'function'
                            ? this.accessToken()
                            : this.accessToken;
            requestOptions.headers["Authorization"] = "Bearer " + accessToken;
        }
    }
}

export class ApiKeyAuth implements Authentication {
    public apiKey: string = '';

    constructor(private location: string, private paramName: string) {
    }

    applyToRequest(requestOptions: localVarRequest.Options): void {
        if (this.location == "query") {
            (<any>requestOptions.qs)[this.paramName] = this.apiKey;
        } else if (this.location == "header" && requestOptions && requestOptions.headers) {
            requestOptions.headers[this.paramName] = this.apiKey;
        } else if (this.location == 'cookie' && requestOptions && requestOptions.headers) {
            if (requestOptions.headers['Cookie']) {
                requestOptions.headers['Cookie'] += '; ' + this.paramName + '=' + encodeURIComponent(this.apiKey);
            }
            else {
                requestOptions.headers['Cookie'] = this.paramName + '=' + encodeURIComponent(this.apiKey);
            }
        }
    }
}

export class OAuth implements Authentication {
    public accessToken: string = '';

    applyToRequest(requestOptions: localVarRequest.Options): void {
        if (requestOptions && requestOptions.headers) {
            requestOptions.headers["Authorization"] = "Bearer " + this.accessToken;
        }
    }
}

export class VoidAuth implements Authentication {
    public username: string = '';
    public password: string = '';

    applyToRequest(_: localVarRequest.Options): void {
        // Do nothing
    }
}

export type Interceptor = (requestOptions: localVarRequest.Options) => (Promise<void> | void);
