/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { FetchHttpRequest } from './core/FetchHttpRequest';
import { AnalyticsService } from './services/AnalyticsService';
import { ChatService } from './services/ChatService';
import { ConfigService } from './services/ConfigService';
import { DashboardService } from './services/DashboardService';
import { HealthService } from './services/HealthService';
import { McpService } from './services/McpService';
import { RealtimeService } from './services/RealtimeService';
import { ToolsService } from './services/ToolsService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class ChatAPI {
    public readonly analytics: AnalyticsService;
    public readonly chat: ChatService;
    public readonly config: ConfigService;
    public readonly dashboard: DashboardService;
    public readonly health: HealthService;
    public readonly mcp: McpService;
    public readonly realtime: RealtimeService;
    public readonly tools: ToolsService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? 'http://localhost:3002',
            VERSION: config?.VERSION ?? '1.0.0',
            WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
            CREDENTIALS: config?.CREDENTIALS ?? 'include',
            TOKEN: config?.TOKEN,
            USERNAME: config?.USERNAME,
            PASSWORD: config?.PASSWORD,
            HEADERS: config?.HEADERS,
            ENCODE_PATH: config?.ENCODE_PATH,
        });
        this.analytics = new AnalyticsService(this.request);
        this.chat = new ChatService(this.request);
        this.config = new ConfigService(this.request);
        this.dashboard = new DashboardService(this.request);
        this.health = new HealthService(this.request);
        this.mcp = new McpService(this.request);
        this.realtime = new RealtimeService(this.request);
        this.tools = new ToolsService(this.request);
    }
}

