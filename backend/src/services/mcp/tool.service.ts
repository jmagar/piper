import type { PrismaClient, type Prisma } from '@prisma/client';

import type { RegisterMcpToolRequestParametersInner } from '../../generated/model/registerMcpToolRequestParametersInner.js';
import type { Tool } from '../../generated/model/tool.js';

import type { McpServerService } from './server.service.js';

interface ToolParameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  schema?: Record<string, unknown>;
}

export class McpToolService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly serverService: McpServerService
  ) {}

  // Helper function to convert OpenAPI Tool to Prisma data
  private toolToPrismaData(tool: Tool): Prisma.McpToolCreateInput {
    return {
      name: tool.name ?? '',
      description: tool.description ?? '',
      type: String(tool.type ?? ''),
      parameters: tool.parameters as unknown as Prisma.InputJsonValue,
      metadata: tool.metadata as unknown as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined,
      server: {
        connect: {
          id: tool.serverId ?? ''
        }
      }
    };
  }

  // Helper function to convert Prisma data to OpenAPI Tool
  private prismaToTool(data: Prisma.McpToolGetPayload<{
    include: { server: true }
  }>): Tool {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type as unknown as Tool['type'],
      parameters: data.parameters as unknown as Tool['parameters'],
      metadata: data.metadata as unknown as Tool['metadata'],
      serverId: data.server.id,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  async registerTool(tool: Tool): Promise<Tool> {
    // Validate tool parameters
    if (!tool.name || !tool.description || !tool.parameters) {
      throw new Error('Invalid tool definition: missing required fields');
    }

    // Check if tool already exists
    const existingTool = await this.prisma.mcpTool.findFirst({
      where: { name: tool.name }
    });

    if (existingTool) {
      throw new Error(`Tool ${tool.name} already exists`);
    }

    // Create tool in database
    const createdTool = await this.prisma.mcpTool.create({
      data: this.toolToPrismaData(tool),
      include: { server: true }
    });

    return this.prismaToTool(createdTool);
  }

  async executeTool(toolName: string, params: Record<string, unknown>, serverId?: string): Promise<unknown> {
    if (!toolName) {
      throw new Error('Tool name is required');
    }

    // Find tool definition
    const tool = await this.prisma.mcpTool.findFirst({
      where: { name: toolName },
      include: { server: true }
    });

    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    // Validate parameters against tool definition
    this.validateParameters(tool, params);

    // If no server specified, find an appropriate server
    const targetServerId = serverId || (await this.findAppropriateServer(tool))?.id;
    if (!targetServerId) {
      throw new Error(`No available server found for tool ${toolName}`);
    }

    // Execute tool on server
    try {
      const result = await this.serverService.executeTool(targetServerId, toolName, params);
      
      // Log execution
      await this.logToolExecution(tool.id, targetServerId, params, result);
      
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // Log failure
      await this.logToolExecution(tool.id, targetServerId, params, null, err);
      throw err;
    }
  }

  private validateParameters(tool: Prisma.McpToolGetPayload<{
    include: { server: true }
  }>, params: Record<string, unknown>): void {
    const toolParams = tool.parameters as unknown as ToolParameter[] | undefined;
    if (!toolParams) return;

    const requiredParams = toolParams.filter(p => p.required);
    for (const param of requiredParams) {
      if (!(param.name in params)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }
    }
  }

  private async findAppropriateServer(tool: Prisma.McpToolGetPayload<{
    include: { server: true }
  }>): Promise<Prisma.McpServerGetPayload<{}> | null> {
    // Find active server that supports this tool
    const server = await this.prisma.mcpServer.findFirst({
      where: {
        status: 'active',
      }
    });

    return server;
  }

  private async logToolExecution(
    toolId: string,
    serverId: string,
    params: Record<string, unknown>,
    result: unknown,
    error?: Error
  ): Promise<void> {
    const now = new Date();
    const resultData = error ? 
      { error: error.message } : 
      result;
    
    // Delete any existing result with the same tool_name and input_hash
    const inputHash = Buffer.from(JSON.stringify(params)).toString('base64');
    await this.prisma.toolResult.deleteMany({
      where: {
        tool_name: toolId,
        input_hash: inputHash
      }
    });

    // Create new result
    await this.prisma.toolResult.create({
      data: {
        tool_name: toolId,
        input_hash: inputHash,
        result: resultData as unknown as Prisma.InputJsonValue,
        expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });
  }

  async listTools(filter?: {
    type?: string;
    server?: string;
  }): Promise<Tool[]> {
    const where: Prisma.McpToolWhereInput = {};
    
    if (filter?.type) {
      where.type = filter.type;
    }

    if (filter?.server) {
      where.server = {
        id: filter.server
      };
    }

    const tools = await this.prisma.mcpTool.findMany({
      where,
      include: { server: true }
    });

    return tools.map(tool => this.prismaToTool(tool));
  }

  async getTool(id: string): Promise<Tool | null> {
    const tool = await this.prisma.mcpTool.findUnique({
      where: { id },
      include: { server: true }
    });

    return tool ? this.prismaToTool(tool) : null;
  }

  async updateTool(id: string, updates: Partial<Tool>): Promise<Tool> {
    const tool = await this.prisma.mcpTool.findUnique({
      where: { id },
      include: { server: true }
    });

    if (!tool) {
      throw new Error(`Tool ${id} not found`);
    }

    const updateData: Prisma.McpToolUpdateInput = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.description) updateData.description = updates.description;
    if (updates.type) updateData.type = String(updates.type);
    if (updates.parameters) updateData.parameters = updates.parameters as unknown as Prisma.InputJsonValue;
    if (updates.metadata) updateData.metadata = updates.metadata as unknown as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined;
    if (updates.serverId) {
      updateData.server = {
        connect: { id: updates.serverId }
      };
    }

    const updatedTool = await this.prisma.mcpTool.update({
      where: { id },
      data: updateData,
      include: { server: true }
    });

    return this.prismaToTool(updatedTool);
  }

  async deleteTool(id: string): Promise<void> {
    await this.prisma.mcpTool.delete({
      where: { id }
    });
  }

  static toModel(tool: Prisma.McpToolCreateInput & { id?: string }): Tool {
    if (!tool.description) {
      throw new Error('Tool description is required');
    }

    if (!tool.server) {
      throw new Error('Tool server is required');
    }

    const serverId = (tool.server as { connect: { id: string } }).connect.id;
    if (!serverId) {
      throw new Error('Tool server ID is required');
    }

    return {
      id: tool.id ?? '',
      name: tool.name,
      description: tool.description,
      type: tool.type as unknown as Tool['type'],
      parameters: tool.parameters as unknown as Tool['parameters'],
      metadata: tool.metadata as unknown as Tool['metadata'],
      serverId,
      createdAt: undefined,
      updatedAt: undefined
    };
  }
}