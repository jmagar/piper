export * from './chatApi';
import { ChatApi } from './chatApi';
export * from './configApi';
import { ConfigApi } from './configApi';
export * from './dashboardApi';
import { DashboardApi } from './dashboardApi';
export * from './healthApi';
import { HealthApi } from './healthApi';
export * from './mCPApi';
import { MCPApi } from './mCPApi';
export * from './promptApi';
import { PromptApi } from './promptApi';
import * as http from 'http';

export class HttpError extends Error {
    constructor (public response: http.IncomingMessage, public body: any, public statusCode?: number) {
        super('HTTP request failed');
        this.name = 'HttpError';
    }
}

export { RequestFile } from '../model/models';

export const APIS = [ChatApi, ConfigApi, DashboardApi, HealthApi, MCPApi, PromptApi];
