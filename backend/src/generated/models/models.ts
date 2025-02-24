import localVarRequest from 'request';

export * from './addMessageReactionRequest';
export * from './apiError';
export * from './chatMessage';
export * from './chatMessageMetadata';
export * from './chatMessageMetadataReactionsValue';
export * from './chatMessageMetadataReactionsValueUsersInner';
export * from './chatMessageType';
export * from './conversation';
export * from './conversationStats';
export * from './createMessageRequest';
export * from './editMessageRequest';
export * from './enhancePrompt200Response';
export * from './enhancePromptRequest';
export * from './enhancePromptRequestOptions';
export * from './getChatStats200Response';
export * from './getConfig200Response';
export * from './getConfig200ResponseLimits';
export * from './getConfig200ResponseProviders';
export * from './getLinkPreview200Response';
export * from './getLinkPreviewRequest';
export * from './getMessages200Response';
export * from './getMetrics200Response';
export * from './getMetrics200ResponseActiveUsersInner';
export * from './getRealtimeStatus200Response';
export * from './invokeTool200Response';
export * from './invokeToolRequest';
export * from './langChainOptions';
export * from './messageReaction';
export * from './sendEventRequest';
export * from './starMessageRequest';
export * from './starredMessage';
export * from './tool';
export * from './toolParametersInner';
export * from './unstarMessageRequest';
export * from './updateConfig200Response';
export * from './updateConfigRequest';
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


import { AddMessageReactionRequest } from './addMessageReactionRequest';
import { ApiError } from './apiError';
import { ChatMessage } from './chatMessage';
import { ChatMessageMetadata } from './chatMessageMetadata';
import { ChatMessageMetadataReactionsValue } from './chatMessageMetadataReactionsValue';
import { ChatMessageMetadataReactionsValueUsersInner } from './chatMessageMetadataReactionsValueUsersInner';
import { ChatMessageType } from './chatMessageType';
import { Conversation } from './conversation';
import { ConversationStats } from './conversationStats';
import { CreateMessageRequest } from './createMessageRequest';
import { EditMessageRequest } from './editMessageRequest';
import { EnhancePrompt200Response } from './enhancePrompt200Response';
import { EnhancePromptRequest } from './enhancePromptRequest';
import { EnhancePromptRequestOptions } from './enhancePromptRequestOptions';
import { GetChatStats200Response } from './getChatStats200Response';
import { GetConfig200Response } from './getConfig200Response';
import { GetConfig200ResponseLimits } from './getConfig200ResponseLimits';
import { GetConfig200ResponseProviders } from './getConfig200ResponseProviders';
import { GetLinkPreview200Response } from './getLinkPreview200Response';
import { GetLinkPreviewRequest } from './getLinkPreviewRequest';
import { GetMessages200Response } from './getMessages200Response';
import { GetMetrics200Response } from './getMetrics200Response';
import { GetMetrics200ResponseActiveUsersInner } from './getMetrics200ResponseActiveUsersInner';
import { GetRealtimeStatus200Response } from './getRealtimeStatus200Response';
import { InvokeTool200Response } from './invokeTool200Response';
import { InvokeToolRequest } from './invokeToolRequest';
import { LangChainOptions } from './langChainOptions';
import { MessageReaction } from './messageReaction';
import { SendEventRequest } from './sendEventRequest';
import { StarMessageRequest } from './starMessageRequest';
import { StarredMessage } from './starredMessage';
import { Tool } from './tool';
import { ToolParametersInner } from './toolParametersInner';
import { UnstarMessageRequest } from './unstarMessageRequest';
import { UpdateConfig200Response } from './updateConfig200Response';
import { UpdateConfigRequest } from './updateConfigRequest';
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
        "ChatMessage.StatusEnum": ChatMessage.StatusEnum,
        "ChatMessageType": ChatMessageType,
        "CreateMessageRequest.TypeEnum": CreateMessageRequest.TypeEnum,
        "GetRealtimeStatus200Response.StatusEnum": GetRealtimeStatus200Response.StatusEnum,
        "LangChainOptions.FallbackProviderEnum": LangChainOptions.FallbackProviderEnum,
        "Tool.TypeEnum": Tool.TypeEnum,
}

let typeMap: {[index: string]: any} = {
    "AddMessageReactionRequest": AddMessageReactionRequest,
    "ApiError": ApiError,
    "ChatMessage": ChatMessage,
    "ChatMessageMetadata": ChatMessageMetadata,
    "ChatMessageMetadataReactionsValue": ChatMessageMetadataReactionsValue,
    "ChatMessageMetadataReactionsValueUsersInner": ChatMessageMetadataReactionsValueUsersInner,
    "Conversation": Conversation,
    "ConversationStats": ConversationStats,
    "CreateMessageRequest": CreateMessageRequest,
    "EditMessageRequest": EditMessageRequest,
    "EnhancePrompt200Response": EnhancePrompt200Response,
    "EnhancePromptRequest": EnhancePromptRequest,
    "EnhancePromptRequestOptions": EnhancePromptRequestOptions,
    "GetChatStats200Response": GetChatStats200Response,
    "GetConfig200Response": GetConfig200Response,
    "GetConfig200ResponseLimits": GetConfig200ResponseLimits,
    "GetConfig200ResponseProviders": GetConfig200ResponseProviders,
    "GetLinkPreview200Response": GetLinkPreview200Response,
    "GetLinkPreviewRequest": GetLinkPreviewRequest,
    "GetMessages200Response": GetMessages200Response,
    "GetMetrics200Response": GetMetrics200Response,
    "GetMetrics200ResponseActiveUsersInner": GetMetrics200ResponseActiveUsersInner,
    "GetRealtimeStatus200Response": GetRealtimeStatus200Response,
    "InvokeTool200Response": InvokeTool200Response,
    "InvokeToolRequest": InvokeToolRequest,
    "LangChainOptions": LangChainOptions,
    "MessageReaction": MessageReaction,
    "SendEventRequest": SendEventRequest,
    "StarMessageRequest": StarMessageRequest,
    "StarredMessage": StarredMessage,
    "Tool": Tool,
    "ToolParametersInner": ToolParametersInner,
    "UnstarMessageRequest": UnstarMessageRequest,
    "UpdateConfig200Response": UpdateConfig200Response,
    "UpdateConfigRequest": UpdateConfigRequest,
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
