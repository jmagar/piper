import type { PrismaClient} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { Tool } from '../../generated/model/tool.js';
import type { McpServerService } from './server.service.js';

export class McpToolService {
  constructor(
    private prisma: PrismaClient,
    private serverService: McpServerService
  ) {}

  // Helper function to convert OpenAPI Tool to Prisma data
  private toolToPrismaData(tool: Tool): Prisma.McpToolCreateInput {
    return {
      name: tool.name,
      description: tool.description,
      type: String(tool.type),
      parameters: JSON.parse(JSON.stringify(tool.parameters)) as Prisma.InputJsonValue,
      metadata: tool.metadata ? JSON.parse(JSON.stringify(tool.metadata)) as Prisma.InputJsonValue : Prisma.JsonNull
    };
  }

  // Helper function to convert Prisma data to OpenAPI Tool
  private prismaToTool(data: any): Tool {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type as Tool.TypeEnum,
      parameters: data.parameters,
      metadata: data.metadata || undefined,
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
      data: this.toolToPrismaData(tool)
    });

    return this.prismaToTool(createdTool);
  }

  async executeTool(toolName: string, params: any, serverId?: string): Promise<any> {
    if (!toolName) {
      throw new Error('Tool name is required');
    }

    // Find tool definition
    const tool = await this.prisma.mcpTool.findFirst({
      where: { name: toolName }
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

  private validateParameters(tool: any, params: any): void {
    const requiredParams = (tool.parameters as any[]).filter(p => p.required);
    
    for (const param of requiredParams) {
      if (!(param.name in params)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }
    }
  }

  private async findAppropriateServer(tool: any): Promise<any> {
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
    params: any,
    result: any,
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
        result: JSON.parse(JSON.stringify(resultData)) as Prisma.InputJsonValue,
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

    const tools = await this.prisma.mcpTool.findMany({ where });
    return tools.map(tool => this.prismaToTool(tool));
  }

  async getTool(id: string): Promise<Tool | null> {
    const tool = await this.prisma.mcpTool.findUnique({
      where: { id }
    });

    return tool ? this.prismaToTool(tool) : null;
  }

  async updateTool(id: string, updates: Partial<Tool>): Promise<Tool> {
    const tool = await this.prisma.mcpTool.findUnique({
      where: { id }
    });

    if (!tool) {
      throw new Error(`Tool ${id} not found`);
    }

    const updateData: Prisma.McpToolUpdateInput = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.description) updateData.description = updates.description;
    if (updates.type) updateData.type = String(updates.type);
    if (updates.parameters) updateData.parameters = JSON.parse(JSON.stringify(updates.parameters)) as Prisma.InputJsonValue;
    if (updates.metadata) updateData.metadata = JSON.parse(JSON.stringify(updates.metadata)) as Prisma.InputJsonValue;

    const updatedTool = await this.prisma.mcpTool.update({
      where: { id },
      data: updateData
    });

    return this.prismaToTool(updatedTool);
  }

  async deleteTool(id: string): Promise<void> {
    await this.prisma.mcpTool.delete({
      where: { id }
    });
  }
}