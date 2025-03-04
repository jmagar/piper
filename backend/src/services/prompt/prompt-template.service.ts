import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../errors/not-found-error.js';
import { ValidationError } from '../../errors/validation-error.js';
import { logger } from '../../utils/logger.js';

// Create a Prisma client instance
const prisma = new PrismaClient();

// Type definitions for our database models
export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  usageCount: number;
  isPublic: boolean;
  isFavorited: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}

export interface PromptUsageHistory {
  id: string;
  promptId: string;
  conversationId?: string;
  userId?: string;
  usedAt: Date;
}

export interface PromptTemplateCreateData {
  title: string;
  description: string;
  content: string;
  category: string;
  tags?: string[];
  isPublic?: boolean;
  userId?: string;
}

export interface PromptTemplateUpdateData {
  title?: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  isFavorited?: boolean;
}

export interface PromptTemplateFilterOptions {
  userId?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  isFavorited?: boolean;
  search?: string;
  sort?: 'usageCount' | 'createdAt' | 'updatedAt' | 'title';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PromptUsageData {
  promptId: string;
  conversationId?: string;
  userId?: string;
}

// For SQL query results
interface CountResult {
  count: string;
}

export class PromptTemplateService {
  /**
   * Create a new prompt template
   * @param data The prompt template data
   * @returns The created prompt template
   */
  static async createPromptTemplate(data: PromptTemplateCreateData) {
    try {
      // Validate required fields
      if (!data.title || !data.description || !data.content || !data.category) {
        throw new ValidationError('Title, description, content, and category are required');
      }

      // Create the prompt template
      const promptTemplate = await prisma.$queryRaw<PromptTemplate[]>`
        INSERT INTO "prompt_templates" (
          "title", "description", "content", "category", "tags", "is_public", "user_id",
          "usage_count", "is_favorited", "created_at", "updated_at"
        ) VALUES (
          ${data.title}, ${data.description}, ${data.content}, ${data.category}, 
          ${data.tags || []}, ${data.isPublic || false}, ${data.userId},
          0, false, NOW(), NOW()
        )
        RETURNING *
      `;

      logger.info(`Created prompt template with ID ${promptTemplate[0].id}`);
      return promptTemplate[0];
    } catch (error) {
      logger.error('Error creating prompt template:', error);
      throw error;
    }
  }

  /**
   * Get a prompt template by ID
   * @param id The ID of the prompt template
   * @returns The prompt template
   */
  static async getPromptTemplate(id: string) {
    try {
      const promptTemplate = await prisma.$queryRaw<PromptTemplate[]>`
        SELECT * FROM "prompt_templates" WHERE "id" = ${id}
      `;

      if (!promptTemplate || promptTemplate.length === 0) {
        throw new NotFoundError(`Prompt template with ID ${id} not found`);
      }

      return promptTemplate[0];
    } catch (error) {
      logger.error(`Error getting prompt template with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a prompt template
   * @param id The ID of the prompt template
   * @param data The updated prompt template data
   * @returns The updated prompt template
   */
  static async updatePromptTemplate(id: string, data: PromptTemplateUpdateData) {
    try {
      // Check if the prompt template exists
      const promptTemplate = await this.getPromptTemplate(id);

      if (!promptTemplate) {
        throw new NotFoundError(`Prompt template with ID ${id} not found`);
      }

      // Build update query
      const setClause = Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => {
          // Convert camelCase to snake_case
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          return `"${snakeKey}" = $${key}`;
        })
        .join(', ');

      // Add updated_at
      const query = `
        UPDATE "prompt_templates"
        SET ${setClause}, "updated_at" = NOW()
        WHERE "id" = $id
        RETURNING *
      `;

      // Generate parameters object
      const params: any = { id, ...data };

      // Execute query
      const updatedPromptTemplate = await prisma.$queryRawUnsafe<PromptTemplate[]>(query, params);

      logger.info(`Updated prompt template with ID ${id}`);
      return updatedPromptTemplate[0];
    } catch (error) {
      logger.error(`Error updating prompt template with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a prompt template
   * @param id The ID of the prompt template
   * @returns The deleted prompt template
   */
  static async deletePromptTemplate(id: string) {
    try {
      // Check if the prompt template exists
      const promptTemplate = await this.getPromptTemplate(id);

      if (!promptTemplate) {
        throw new NotFoundError(`Prompt template with ID ${id} not found`);
      }

      // Delete related usage history
      await prisma.$executeRaw`
        DELETE FROM "prompt_usage_history" WHERE "prompt_id" = ${id}
      `;

      // Delete the prompt template
      const deletedPromptTemplate = await prisma.$queryRaw<PromptTemplate[]>`
        DELETE FROM "prompt_templates" WHERE "id" = ${id} RETURNING *
      `;

      logger.info(`Deleted prompt template with ID ${id}`);
      return deletedPromptTemplate[0];
    } catch (error) {
      logger.error(`Error deleting prompt template with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get prompt templates based on filter options
   * @param options Filter and pagination options
   * @returns List of prompt templates and count
   */
  static async getPromptTemplates(options: PromptTemplateFilterOptions = {}) {
    try {
      const {
        userId,
        category,
        tags,
        isPublic,
        isFavorited,
        search,
        sort = 'updatedAt',
        order = 'desc',
        limit = 10,
        offset = 0,
      } = options;

      // Build where conditions
      const whereConditions = [];

      if (userId) {
        whereConditions.push(`"user_id" = '${userId}'`);
      }

      if (category) {
        whereConditions.push(`"category" = '${category}'`);
      }

      if (tags && tags.length > 0) {
        const tagsCondition = tags.map(tag => `'${tag}' = ANY("tags")`).join(' AND ');
        whereConditions.push(`(${tagsCondition})`);
      }

      if (isPublic !== undefined) {
        whereConditions.push(`"is_public" = ${isPublic}`);
      }

      if (isFavorited !== undefined) {
        whereConditions.push(`"is_favorited" = ${isFavorited}`);
      }

      if (search) {
        whereConditions.push(`("title" ILIKE '%${search}%' OR "description" ILIKE '%${search}%')`);
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Convert camelCase to snake_case for sort column
      const sortCol = sort.replace(/([A-Z])/g, '_$1').toLowerCase();

      // Get prompt templates
      const query = `
        SELECT * FROM "prompt_templates"
        ${whereClause}
        ORDER BY "${sortCol}" ${order}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countQuery = `
        SELECT COUNT(*) FROM "prompt_templates"
        ${whereClause}
      `;

      const [promptTemplates, countResult] = await Promise.all([
        prisma.$queryRawUnsafe<PromptTemplate[]>(query),
        prisma.$queryRawUnsafe<CountResult[]>(countQuery),
      ]);

      const count = parseInt(countResult[0].count, 10);

      return { promptTemplates, count };
    } catch (error) {
      logger.error('Error getting prompt templates:', error);
      throw error;
    }
  }

  /**
   * Toggle the favorite status of a prompt template
   * @param id The ID of the prompt template
   * @returns The updated prompt template
   */
  static async toggleFavorite(id: string) {
    try {
      // Check if the prompt template exists
      const promptTemplate = await this.getPromptTemplate(id);

      if (!promptTemplate) {
        throw new NotFoundError(`Prompt template with ID ${id} not found`);
      }

      // Toggle the favorite status
      const updatedPromptTemplate = await prisma.$queryRaw<PromptTemplate[]>`
        UPDATE "prompt_templates"
        SET "is_favorited" = NOT "is_favorited", "updated_at" = NOW()
        WHERE "id" = ${id}
        RETURNING *
      `;

      logger.info(`Toggled favorite status of prompt template with ID ${id}`);
      return updatedPromptTemplate[0];
    } catch (error) {
      logger.error(`Error toggling favorite status of prompt template with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Record usage of a prompt template
   * @param data The prompt usage data
   * @returns The created prompt usage history record
   */
  static async recordPromptUsage(data: PromptUsageData) {
    try {
      // Check if the prompt template exists
      const promptTemplate = await this.getPromptTemplate(data.promptId);

      if (!promptTemplate) {
        throw new NotFoundError(`Prompt template with ID ${data.promptId} not found`);
      }

      // Create usage history record
      const usageHistory = await prisma.$queryRaw<PromptUsageHistory[]>`
        INSERT INTO "prompt_usage_history" (
          "prompt_id", "conversation_id", "user_id", "used_at"
        ) VALUES (
          ${data.promptId}, ${data.conversationId}, ${data.userId}, NOW()
        )
        RETURNING *
      `;

      // Increment usage count
      await prisma.$queryRaw`
        UPDATE "prompt_templates"
        SET "usage_count" = "usage_count" + 1, "updated_at" = NOW()
        WHERE "id" = ${data.promptId}
      `;

      logger.info(`Recorded usage of prompt template with ID ${data.promptId}`);
      return usageHistory[0];
    } catch (error) {
      logger.error(`Error recording usage of prompt template with ID ${data.promptId}:`, error);
      throw error;
    }
  }
} 