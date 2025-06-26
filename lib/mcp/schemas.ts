import { z } from 'zod';

export const EnhancedTransportConfigSchema = z.union([
  z.object({
    type: z.literal('stdio'),
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    cwd: z.string().optional(),
    stderr: z.enum(['inherit', 'ignore', 'pipe']).optional(),
    clientName: z.string().optional(),
    timeout: z.number().optional(),
    onUncaughtError: z.function().optional()
  }),
  z.object({
    type: z.literal('sse'),
    url: z.string(),
    headers: z.record(z.string()).optional(),
    clientName: z.string().optional(),
    timeout: z.number().optional(),
    onUncaughtError: z.function().optional()
  }),
  z.object({
    type: z.literal('streamable-http'),
    url: z.string(),
    sessionId: z.string().optional(),
    headers: z.record(z.string()).optional(),
    clientName: z.string().optional(),
    timeout: z.number().optional(),
    onUncaughtError: z.function().optional()
  })
]);

export const ServerConfigEntrySchema = z.object({
  label: z.string().optional(),
  disabled: z.boolean().optional(),
  enabled: z.boolean().optional(),
  transportType: z.enum(['stdio', 'sse', 'streamable-http']).optional(),
  name: z.string().optional(),
  transport: EnhancedTransportConfigSchema.optional(),
  schemas: z.record(z.unknown()).optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  url: z.string().optional(),
  headers: z.record(z.string()).optional()
});

export const AppConfigSchema = z.object({
  mcpServers: z.record(ServerConfigEntrySchema)
}); 