/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { FetchHttpRequest } from './core/FetchHttpRequest';
import { ChatService } from './services/ChatService';
import { ConfigService } from './services/ConfigService';
import { DashboardService } from './services/DashboardService';
import { HealthService } from './services/HealthService';
import { McpService } from './services/McpService';
import { PromptService } from './services/PromptService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class ChatAPI {
    public readonly chat: ChatService;
    public readonly config: ConfigService;
    public readonly dashboard: DashboardService;
    public readonly health: HealthService;
    public readonly mcp: McpService;
    public readonly prompt: PromptService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? 'http://localhost:4100',
            VERSION: config?.VERSION ?? '1.0.0',
            WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
            CREDENTIALS: config?.CREDENTIALS ?? 'include',
            TOKEN: config?.TOKEN,
            USERNAME: config?.USERNAME,
            PASSWORD: config?.PASSWORD,
            HEADERS: config?.HEADERS,
            ENCODE_PATH: config?.ENCODE_PATH,
        });
        this.chat = new ChatService(this.request);
        this.config = new ConfigService(this.request);
        this.dashboard = new DashboardService(this.request);
        this.health = new HealthService(this.request);
        this.mcp = new McpService(this.request);
        this.prompt = new PromptService(this.request);
    }
}

