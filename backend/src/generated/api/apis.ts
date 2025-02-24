export * from './analyticsApi';
import { AnalyticsApi } from './analyticsApi';
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
export * from './previewApi';
import { PreviewApi } from './previewApi';
export * from './promptApi';
import { PromptApi } from './promptApi';
export * from './realtimeApi';
import { RealtimeApi } from './realtimeApi';
export * from './toolsApi';
import { ToolsApi } from './toolsApi';
import * as http from 'http';

export class HttpError extends Error {
    constructor (public response: http.IncomingMessage, public body: any, public statusCode?: number) {
        super('HTTP request failed');
        this.name = 'HttpError';
    }
}

export { RequestFile } from '../model/models';

export const APIS = [AnalyticsApi, ChatApi, ConfigApi, DashboardApi, HealthApi, MCPApi, PreviewApi, PromptApi, RealtimeApi, ToolsApi];
