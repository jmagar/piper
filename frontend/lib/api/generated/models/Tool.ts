/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Tool = {
  id: string;
  name: string;
  description?: string;
  serverId: string;
  type?: Tool.type;
  parameters?: Array<{
    name: string;
    type: string;
    description?: string;
    required?: boolean;
    schema?: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};
export namespace Tool {
  export enum type {
    SYSTEM = 'system',
    PLUGIN = 'plugin',
    CUSTOM = 'custom',
  }
}

