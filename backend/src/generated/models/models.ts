import localVarRequest from 'request';

export * from './apiChatMessagesStarPostRequest';
export * from './apiChatMessagesUnstarPost200Response';
export * from './apiChatMessagesUnstarPostRequest';
export * from './apiChatPostRequest';
export * from './apiDashboardStatsGet200Response';
export * from './apiError';
export * from './apiHealthGet200Response';
export * from './apiMcpConfigBackupBackupIdDelete200Response';
export * from './apiMcpConfigBackupGet200Response';
export * from './apiMcpConfigBackupGet200ResponseBackupsInner';
export * from './apiMcpConfigBackupPost200Response';
export * from './apiMcpConfigPut200Response';
export * from './apiMcpConfigValidatePost200Response';
export * from './apiMcpConfigValidatePost200ResponseErrorsInner';
export * from './apiMcpHealthGet200Response';
export * from './apiMcpHealthGet200ResponseMemoryUsage';
export * from './apiMcpServersPostRequest';
export * from './apiMcpToolsNameExecutePostRequest';
export * from './apiPromptEnhancePost200Response';
export * from './apiPromptEnhancePostRequest';
export * from './chatMessage';
export * from './chatMessageMetadata';
export * from './chatMessageMetadataReactionsValue';
export * from './chatMessageMetadataReactionsValueUsersInner';
export * from './chatMessageType';
export * from './conversation';
export * from './conversationStats';
export * from './langChainOptions';
export * from './messageReaction';
export * from './starredMessage';
export * from './streamChunk';
export * from './tool';
export * from './toolParametersInner';
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


import { ApiChatMessagesStarPostRequest } from './apiChatMessagesStarPostRequest';
import { ApiChatMessagesUnstarPost200Response } from './apiChatMessagesUnstarPost200Response';
import { ApiChatMessagesUnstarPostRequest } from './apiChatMessagesUnstarPostRequest';
import { ApiChatPostRequest } from './apiChatPostRequest';
import { ApiDashboardStatsGet200Response } from './apiDashboardStatsGet200Response';
import { ApiError } from './apiError';
import { ApiHealthGet200Response } from './apiHealthGet200Response';
import { ApiMcpConfigBackupBackupIdDelete200Response } from './apiMcpConfigBackupBackupIdDelete200Response';
import { ApiMcpConfigBackupGet200Response } from './apiMcpConfigBackupGet200Response';
import { ApiMcpConfigBackupGet200ResponseBackupsInner } from './apiMcpConfigBackupGet200ResponseBackupsInner';
import { ApiMcpConfigBackupPost200Response } from './apiMcpConfigBackupPost200Response';
import { ApiMcpConfigPut200Response } from './apiMcpConfigPut200Response';
import { ApiMcpConfigValidatePost200Response } from './apiMcpConfigValidatePost200Response';
import { ApiMcpConfigValidatePost200ResponseErrorsInner } from './apiMcpConfigValidatePost200ResponseErrorsInner';
import { ApiMcpHealthGet200Response } from './apiMcpHealthGet200Response';
import { ApiMcpHealthGet200ResponseMemoryUsage } from './apiMcpHealthGet200ResponseMemoryUsage';
import { ApiMcpServersPostRequest } from './apiMcpServersPostRequest';
import { ApiMcpToolsNameExecutePostRequest } from './apiMcpToolsNameExecutePostRequest';
import { ApiPromptEnhancePost200Response } from './apiPromptEnhancePost200Response';
import { ApiPromptEnhancePostRequest } from './apiPromptEnhancePostRequest';
import { ChatMessage } from './chatMessage';
import { ChatMessageMetadata } from './chatMessageMetadata';
import { ChatMessageMetadataReactionsValue } from './chatMessageMetadataReactionsValue';
import { ChatMessageMetadataReactionsValueUsersInner } from './chatMessageMetadataReactionsValueUsersInner';
import { ChatMessageType } from './chatMessageType';
import { Conversation } from './conversation';
import { ConversationStats } from './conversationStats';
import { LangChainOptions } from './langChainOptions';
import { MessageReaction } from './messageReaction';
import { StarredMessage } from './starredMessage';
import { StreamChunk } from './streamChunk';
import { Tool } from './tool';
import { ToolParametersInner } from './toolParametersInner';
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
        "ApiMcpConfigValidatePost200ResponseErrorsInner.SeverityEnum": ApiMcpConfigValidatePost200ResponseErrorsInner.SeverityEnum,
        "ChatMessage.RoleEnum": ChatMessage.RoleEnum,
        "ChatMessage.StatusEnum": ChatMessage.StatusEnum,
        "ChatMessageMetadata.StreamStatusEnum": ChatMessageMetadata.StreamStatusEnum,
        "ChatMessageType": ChatMessageType,
        "LangChainOptions.FallbackProviderEnum": LangChainOptions.FallbackProviderEnum,
        "StreamChunk.TypeEnum": StreamChunk.TypeEnum,
        "Tool.TypeEnum": Tool.TypeEnum,
}

let typeMap: {[index: string]: any} = {
    "ApiChatMessagesStarPostRequest": ApiChatMessagesStarPostRequest,
    "ApiChatMessagesUnstarPost200Response": ApiChatMessagesUnstarPost200Response,
    "ApiChatMessagesUnstarPostRequest": ApiChatMessagesUnstarPostRequest,
    "ApiChatPostRequest": ApiChatPostRequest,
    "ApiDashboardStatsGet200Response": ApiDashboardStatsGet200Response,
    "ApiError": ApiError,
    "ApiHealthGet200Response": ApiHealthGet200Response,
    "ApiMcpConfigBackupBackupIdDelete200Response": ApiMcpConfigBackupBackupIdDelete200Response,
    "ApiMcpConfigBackupGet200Response": ApiMcpConfigBackupGet200Response,
    "ApiMcpConfigBackupGet200ResponseBackupsInner": ApiMcpConfigBackupGet200ResponseBackupsInner,
    "ApiMcpConfigBackupPost200Response": ApiMcpConfigBackupPost200Response,
    "ApiMcpConfigPut200Response": ApiMcpConfigPut200Response,
    "ApiMcpConfigValidatePost200Response": ApiMcpConfigValidatePost200Response,
    "ApiMcpConfigValidatePost200ResponseErrorsInner": ApiMcpConfigValidatePost200ResponseErrorsInner,
    "ApiMcpHealthGet200Response": ApiMcpHealthGet200Response,
    "ApiMcpHealthGet200ResponseMemoryUsage": ApiMcpHealthGet200ResponseMemoryUsage,
    "ApiMcpServersPostRequest": ApiMcpServersPostRequest,
    "ApiMcpToolsNameExecutePostRequest": ApiMcpToolsNameExecutePostRequest,
    "ApiPromptEnhancePost200Response": ApiPromptEnhancePost200Response,
    "ApiPromptEnhancePostRequest": ApiPromptEnhancePostRequest,
    "ChatMessage": ChatMessage,
    "ChatMessageMetadata": ChatMessageMetadata,
    "ChatMessageMetadataReactionsValue": ChatMessageMetadataReactionsValue,
    "ChatMessageMetadataReactionsValueUsersInner": ChatMessageMetadataReactionsValueUsersInner,
    "Conversation": Conversation,
    "ConversationStats": ConversationStats,
    "LangChainOptions": LangChainOptions,
    "MessageReaction": MessageReaction,
    "StarredMessage": StarredMessage,
    "StreamChunk": StreamChunk,
    "Tool": Tool,
    "ToolParametersInner": ToolParametersInner,
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
