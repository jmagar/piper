export * from './chatApi';
import { ChatApi } from './chatApi';
export * from './configApi';
import { ConfigApi } from './configApi';
export * from './defaultApi';
import { DefaultApi } from './defaultApi';
export * from './documentsApi';
import { DocumentsApi } from './documentsApi';
export * from './healthApi';
import { HealthApi } from './healthApi';
export * from './knowledgeApi';
import { KnowledgeApi } from './knowledgeApi';
export * from './mCPApi';
import { MCPApi } from './mCPApi';
export * from './promptApi';
import { PromptApi } from './promptApi';
export * from './systemApi';
import { SystemApi } from './systemApi';
import * as http from 'http';

export class HttpError extends Error {
    constructor (public response: http.IncomingMessage, public body: any, public statusCode?: number) {
        super('HTTP request failed');
        this.name = 'HttpError';
    }
}

export { RequestFile } from '../model/models';

export const APIS = [ChatApi, ConfigApi, DefaultApi, DocumentsApi, HealthApi, KnowledgeApi, MCPApi, PromptApi, SystemApi];
