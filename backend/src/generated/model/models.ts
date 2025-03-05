import localVarRequest from 'request';

export * from './activity';
export * from './alert';
export * from './apiChatMessagesStarPostRequest';
export * from './apiChatMessagesUnstarPost200Response';
export * from './apiChatMessagesUnstarPostRequest';
export * from './apiChatPostRequest';
export * from './apiDashboardActivityGet200Response';
export * from './apiDashboardAlertsGet200Response';
export * from './apiDashboardDocumentsGet200Response';
export * from './apiDocumentsIdDelete200Response';
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
export * from './apiPromptsIdUsePostRequest';
export * from './apiSystemTestOpenaiGet200Response';
export * from './apiSystemTestQdrantGet200Response';
export * from './bookmarkKnowledgeDocument200Response';
export * from './chatMessage';
export * from './chatMessageMetadata';
export * from './chatMessageMetadataReactionsValue';
export * from './chatMessageMetadataReactionsValueUsersInner';
export * from './chatMessageType';
export * from './conversation';
export * from './conversationStats';
export * from './createKnowledgeCollection201Response';
export * from './createKnowledgeCollectionRequest';
export * from './dashboardSummary';
export * from './dashboardSummaryConversations';
export * from './dashboardSummaryServerStatus';
export * from './document';
export * from './document1';
export * from './documentCreateRequest';
export * from './documentMetadata';
export * from './documentUpdateRequest';
export * from './documentsResponse';
export * from './fileExplorerNode';
export * from './fileExplorerResponse';
export * from './getMcpLogs200Response';
export * from './knowledgeCollection';
export * from './knowledgeCollectionsResponse';
export * from './knowledgeDocument';
export * from './knowledgeDocumentBookmarkRequest';
export * from './knowledgeDocumentCreateRequest';
export * from './knowledgeDocumentCreateResponse';
export * from './knowledgeDocumentDeleteResponse';
export * from './knowledgeDocumentsResponse';
export * from './knowledgeSearchRequest';
export * from './knowledgeSearchResponse';
export * from './knowledgeSearchResult';
export * from './knowledgeSearchResultMetadata';
export * from './langChainOptions';
export * from './logEntry';
export * from './mcpServerStats';
export * from './mcpServerStatsServersInner';
export * from './mcpServerStatsTopToolsInner';
export * from './messageReaction';
export * from './modelError';
export * from './promptTemplate';
export * from './promptTemplateCreate';
export * from './promptTemplateListResponse';
export * from './promptTemplateUpdate';
export * from './promptUsageHistory';
export * from './searchOptions';
export * from './searchOptionsFilter';
export * from './searchResponse';
export * from './starredMessage';
export * from './streamChunk';
export * from './streamMcpLogs200Response';
export * from './systemStatus';
export * from './systemStatusEnvironment';
export * from './systemStatusServices';
export * from './systemStatusServicesOpenai';
export * from './systemStatusServicesQdrant';
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


import { Activity } from './activity';
import { Alert } from './alert';
import { ApiChatMessagesStarPostRequest } from './apiChatMessagesStarPostRequest';
import { ApiChatMessagesUnstarPost200Response } from './apiChatMessagesUnstarPost200Response';
import { ApiChatMessagesUnstarPostRequest } from './apiChatMessagesUnstarPostRequest';
import { ApiChatPostRequest } from './apiChatPostRequest';
import { ApiDashboardActivityGet200Response } from './apiDashboardActivityGet200Response';
import { ApiDashboardAlertsGet200Response } from './apiDashboardAlertsGet200Response';
import { ApiDashboardDocumentsGet200Response } from './apiDashboardDocumentsGet200Response';
import { ApiDocumentsIdDelete200Response } from './apiDocumentsIdDelete200Response';
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
import { ApiPromptsIdUsePostRequest } from './apiPromptsIdUsePostRequest';
import { ApiSystemTestOpenaiGet200Response } from './apiSystemTestOpenaiGet200Response';
import { ApiSystemTestQdrantGet200Response } from './apiSystemTestQdrantGet200Response';
import { BookmarkKnowledgeDocument200Response } from './bookmarkKnowledgeDocument200Response';
import { ChatMessage } from './chatMessage';
import { ChatMessageMetadata } from './chatMessageMetadata';
import { ChatMessageMetadataReactionsValue } from './chatMessageMetadataReactionsValue';
import { ChatMessageMetadataReactionsValueUsersInner } from './chatMessageMetadataReactionsValueUsersInner';
import { ChatMessageType } from './chatMessageType';
import { Conversation } from './conversation';
import { ConversationStats } from './conversationStats';
import { CreateKnowledgeCollection201Response } from './createKnowledgeCollection201Response';
import { CreateKnowledgeCollectionRequest } from './createKnowledgeCollectionRequest';
import { DashboardSummary } from './dashboardSummary';
import { DashboardSummaryConversations } from './dashboardSummaryConversations';
import { DashboardSummaryServerStatus } from './dashboardSummaryServerStatus';
import { Document } from './document';
import { Document1 } from './document1';
import { DocumentCreateRequest } from './documentCreateRequest';
import { DocumentMetadata } from './documentMetadata';
import { DocumentUpdateRequest } from './documentUpdateRequest';
import { DocumentsResponse } from './documentsResponse';
import { FileExplorerNode } from './fileExplorerNode';
import { FileExplorerResponse } from './fileExplorerResponse';
import { GetMcpLogs200Response } from './getMcpLogs200Response';
import { KnowledgeCollection } from './knowledgeCollection';
import { KnowledgeCollectionsResponse } from './knowledgeCollectionsResponse';
import { KnowledgeDocument } from './knowledgeDocument';
import { KnowledgeDocumentBookmarkRequest } from './knowledgeDocumentBookmarkRequest';
import { KnowledgeDocumentCreateRequest } from './knowledgeDocumentCreateRequest';
import { KnowledgeDocumentCreateResponse } from './knowledgeDocumentCreateResponse';
import { KnowledgeDocumentDeleteResponse } from './knowledgeDocumentDeleteResponse';
import { KnowledgeDocumentsResponse } from './knowledgeDocumentsResponse';
import { KnowledgeSearchRequest } from './knowledgeSearchRequest';
import { KnowledgeSearchResponse } from './knowledgeSearchResponse';
import { KnowledgeSearchResult } from './knowledgeSearchResult';
import { KnowledgeSearchResultMetadata } from './knowledgeSearchResultMetadata';
import { LangChainOptions } from './langChainOptions';
import { LogEntry } from './logEntry';
import { McpServerStats } from './mcpServerStats';
import { McpServerStatsServersInner } from './mcpServerStatsServersInner';
import { McpServerStatsTopToolsInner } from './mcpServerStatsTopToolsInner';
import { MessageReaction } from './messageReaction';
import { ModelError } from './modelError';
import { PromptTemplate } from './promptTemplate';
import { PromptTemplateCreate } from './promptTemplateCreate';
import { PromptTemplateListResponse } from './promptTemplateListResponse';
import { PromptTemplateUpdate } from './promptTemplateUpdate';
import { PromptUsageHistory } from './promptUsageHistory';
import { SearchOptions } from './searchOptions';
import { SearchOptionsFilter } from './searchOptionsFilter';
import { SearchResponse } from './searchResponse';
import { StarredMessage } from './starredMessage';
import { StreamChunk } from './streamChunk';
import { StreamMcpLogs200Response } from './streamMcpLogs200Response';
import { SystemStatus } from './systemStatus';
import { SystemStatusEnvironment } from './systemStatusEnvironment';
import { SystemStatusServices } from './systemStatusServices';
import { SystemStatusServicesOpenai } from './systemStatusServicesOpenai';
import { SystemStatusServicesQdrant } from './systemStatusServicesQdrant';
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
        "Activity.TypeEnum": Activity.TypeEnum,
        "Alert.TypeEnum": Alert.TypeEnum,
        "ApiMcpConfigValidatePost200ResponseErrorsInner.SeverityEnum": ApiMcpConfigValidatePost200ResponseErrorsInner.SeverityEnum,
        "ApiSystemTestOpenaiGet200Response.StatusEnum": ApiSystemTestOpenaiGet200Response.StatusEnum,
        "ApiSystemTestQdrantGet200Response.StatusEnum": ApiSystemTestQdrantGet200Response.StatusEnum,
        "ChatMessage.RoleEnum": ChatMessage.RoleEnum,
        "ChatMessage.StatusEnum": ChatMessage.StatusEnum,
        "ChatMessageMetadata.StreamStatusEnum": ChatMessageMetadata.StreamStatusEnum,
        "ChatMessageType": ChatMessageType,
        "DocumentMetadata.FileTypeEnum": DocumentMetadata.FileTypeEnum,
        "LangChainOptions.FallbackProviderEnum": LangChainOptions.FallbackProviderEnum,
        "LogEntry.LevelEnum": LogEntry.LevelEnum,
        "McpServerStatsServersInner.StatusEnum": McpServerStatsServersInner.StatusEnum,
        "StreamChunk.TypeEnum": StreamChunk.TypeEnum,
        "StreamMcpLogs200Response.StatusEnum": StreamMcpLogs200Response.StatusEnum,
        "SystemStatusServicesOpenai.StatusEnum": SystemStatusServicesOpenai.StatusEnum,
        "SystemStatusServicesQdrant.StatusEnum": SystemStatusServicesQdrant.StatusEnum,
        "Tool.TypeEnum": Tool.TypeEnum,
}

let typeMap: {[index: string]: any} = {
    "Activity": Activity,
    "Alert": Alert,
    "ApiChatMessagesStarPostRequest": ApiChatMessagesStarPostRequest,
    "ApiChatMessagesUnstarPost200Response": ApiChatMessagesUnstarPost200Response,
    "ApiChatMessagesUnstarPostRequest": ApiChatMessagesUnstarPostRequest,
    "ApiChatPostRequest": ApiChatPostRequest,
    "ApiDashboardActivityGet200Response": ApiDashboardActivityGet200Response,
    "ApiDashboardAlertsGet200Response": ApiDashboardAlertsGet200Response,
    "ApiDashboardDocumentsGet200Response": ApiDashboardDocumentsGet200Response,
    "ApiDocumentsIdDelete200Response": ApiDocumentsIdDelete200Response,
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
    "ApiPromptsIdUsePostRequest": ApiPromptsIdUsePostRequest,
    "ApiSystemTestOpenaiGet200Response": ApiSystemTestOpenaiGet200Response,
    "ApiSystemTestQdrantGet200Response": ApiSystemTestQdrantGet200Response,
    "BookmarkKnowledgeDocument200Response": BookmarkKnowledgeDocument200Response,
    "ChatMessage": ChatMessage,
    "ChatMessageMetadata": ChatMessageMetadata,
    "ChatMessageMetadataReactionsValue": ChatMessageMetadataReactionsValue,
    "ChatMessageMetadataReactionsValueUsersInner": ChatMessageMetadataReactionsValueUsersInner,
    "Conversation": Conversation,
    "ConversationStats": ConversationStats,
    "CreateKnowledgeCollection201Response": CreateKnowledgeCollection201Response,
    "CreateKnowledgeCollectionRequest": CreateKnowledgeCollectionRequest,
    "DashboardSummary": DashboardSummary,
    "DashboardSummaryConversations": DashboardSummaryConversations,
    "DashboardSummaryServerStatus": DashboardSummaryServerStatus,
    "Document": Document,
    "Document1": Document1,
    "DocumentCreateRequest": DocumentCreateRequest,
    "DocumentMetadata": DocumentMetadata,
    "DocumentUpdateRequest": DocumentUpdateRequest,
    "DocumentsResponse": DocumentsResponse,
    "FileExplorerNode": FileExplorerNode,
    "FileExplorerResponse": FileExplorerResponse,
    "GetMcpLogs200Response": GetMcpLogs200Response,
    "KnowledgeCollection": KnowledgeCollection,
    "KnowledgeCollectionsResponse": KnowledgeCollectionsResponse,
    "KnowledgeDocument": KnowledgeDocument,
    "KnowledgeDocumentBookmarkRequest": KnowledgeDocumentBookmarkRequest,
    "KnowledgeDocumentCreateRequest": KnowledgeDocumentCreateRequest,
    "KnowledgeDocumentCreateResponse": KnowledgeDocumentCreateResponse,
    "KnowledgeDocumentDeleteResponse": KnowledgeDocumentDeleteResponse,
    "KnowledgeDocumentsResponse": KnowledgeDocumentsResponse,
    "KnowledgeSearchRequest": KnowledgeSearchRequest,
    "KnowledgeSearchResponse": KnowledgeSearchResponse,
    "KnowledgeSearchResult": KnowledgeSearchResult,
    "KnowledgeSearchResultMetadata": KnowledgeSearchResultMetadata,
    "LangChainOptions": LangChainOptions,
    "LogEntry": LogEntry,
    "McpServerStats": McpServerStats,
    "McpServerStatsServersInner": McpServerStatsServersInner,
    "McpServerStatsTopToolsInner": McpServerStatsTopToolsInner,
    "MessageReaction": MessageReaction,
    "ModelError": ModelError,
    "PromptTemplate": PromptTemplate,
    "PromptTemplateCreate": PromptTemplateCreate,
    "PromptTemplateListResponse": PromptTemplateListResponse,
    "PromptTemplateUpdate": PromptTemplateUpdate,
    "PromptUsageHistory": PromptUsageHistory,
    "SearchOptions": SearchOptions,
    "SearchOptionsFilter": SearchOptionsFilter,
    "SearchResponse": SearchResponse,
    "StarredMessage": StarredMessage,
    "StreamChunk": StreamChunk,
    "StreamMcpLogs200Response": StreamMcpLogs200Response,
    "SystemStatus": SystemStatus,
    "SystemStatusEnvironment": SystemStatusEnvironment,
    "SystemStatusServices": SystemStatusServices,
    "SystemStatusServicesOpenai": SystemStatusServicesOpenai,
    "SystemStatusServicesQdrant": SystemStatusServicesQdrant,
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
