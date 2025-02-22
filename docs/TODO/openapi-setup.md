# Setting up OpenAPI with Next.js App Router

## 1. Installation

```bash
# Install OpenAPI tools
pnpm add -D openapi-typescript-codegen
pnpm add -D @openapitools/openapi-generator-cli
pnpm add -D swagger-ui-react

# Install runtime dependencies
pnpm add zod-to-openapi
```

## 2. Project Structure

```
project/
├── openapi/
│   ├── schemas/           # OpenAPI schema definitions
│   │   ├── server.yaml
│   │   ├── tool.yaml
│   │   └── common.yaml
│   ├── generated/        # Generated code
│   │   ├── client/       # API client
│   │   ├── types/        # TypeScript types
│   │   └── schemas/      # Zod schemas
│   └── main.yaml         # Main OpenAPI spec
├── scripts/
│   └── generate-api.ts   # Generation script
```

## 3. Define OpenAPI Schemas

### openapi/main.yaml
```yaml
openapi: 3.0.0
info:
  title: MCP API
  version: 1.0.0
  description: Model Context Protocol API

servers:
  - url: http://localhost:4100
    description: Development server

paths:
  $ref: './schemas/*.yaml'

components:
  schemas:
    Server:
      type: object
      required:
        - name
        - url
        - type
      properties:
        id:
          type: string
        name:
          type: string
          minLength: 1
        url:
          type: string
          format: uri
        type:
          type: string
          enum: [primary, secondary, replica]
        status:
          type: string
          enum: [active, inactive, maintenance]
          default: active
        metadata:
          type: object
          additionalProperties: true

    Tool:
      type: object
      required:
        - name
        - description
        - type
        - parameters
      properties:
        id:
          type: string
        name:
          type: string
          minLength: 1
        description:
          type: string
        type:
          type: string
          enum: [system, user, plugin]
        parameters:
          type: array
          items:
            $ref: '#/components/schemas/ToolParameter'
        metadata:
          type: object
          additionalProperties: true

    ToolParameter:
      type: object
      required:
        - name
        - type
      properties:
        name:
          type: string
        type:
          type: string
        description:
          type: string
        required:
          type: boolean
          default: false
```

### openapi/schemas/chat.yaml
```yaml
components:
  schemas:
    ChatMessage:
      type: object
      required:
        - content
        - role
      properties:
        id:
          type: string
          format: uuid
        content:
          type: string
        role:
          type: string
          enum: [user, assistant]
        conversation_id:
          type: string
          format: uuid
        user_id:
          type: string
          format: uuid
        parent_id:
          type: string
          format: uuid
        thread_summary:
          type: string
        metadata:
          type: object
          additionalProperties: true
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    Conversation:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        summary:
          type: string
        last_message_at:
          type: string
          format: date-time
        is_archived:
          type: boolean
          default: false
        user_id:
          type: string
          format: uuid
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    MessageReaction:
      type: object
      required:
        - emoji
        - message_id
        - user_id
      properties:
        id:
          type: string
          format: uuid
        emoji:
          type: string
        message_id:
          type: string
          format: uuid
        user_id:
          type: string
          format: uuid
        group:
          type: string
        created_at:
          type: string
          format: date-time

paths:
  /chat:
    get:
      summary: Get messages
      parameters:
        - name: conversationId
          in: query
          schema:
            type: string
            format: uuid
        - name: cursor
          in: query
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: search
          in: query
          schema:
            type: string
        - name: threadId
          in: query
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: List of messages
          content:
            application/json:
              schema:
                type: object
                properties:
                  messages:
                    type: array
                    items:
                      $ref: '#/components/schemas/ChatMessage'
                  nextCursor:
                    type: string
                  total:
                    type: integer
    post:
      summary: Create message
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - content
                - userId
                - username
              properties:
                content:
                  type: string
                userId:
                  type: string
                  format: uuid
                username:
                  type: string
                conversationId:
                  type: string
                  format: uuid
                parentId:
                  type: string
                  format: uuid
                type:
                  type: string
                  enum: [text, code, system]
                  default: text
                metadata:
                  type: object
                  additionalProperties: true
      responses:
        201:
          description: Created message
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChatMessage'

  /chat/conversations/{userId}:
    get:
      summary: Get user conversations
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: List of conversations
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Conversation'

  /chat/reactions/batch:
    post:
      summary: Batch update reactions
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - messageId
                - userId
                - reactions
              properties:
                messageId:
                  type: string
                  format: uuid
                userId:
                  type: string
                  format: uuid
                reactions:
                  type: array
                  items:
                    type: string
      responses:
        200:
          description: Updated reactions
          content:
            application/json:
              schema:
                type: object
                additionalProperties:
                  type: object
                  properties:
                    count:
                      type: integer
                    users:
                      type: array
                      items:
                        type: object
                        properties:
                          id:
                            type: string
                            format: uuid
                          name:
                            type: string
```

## 4. Generation Script

### scripts/generate-api.ts
```typescript
import { execSync } from 'child_process';
import { resolve } from 'path';
import { generateApi } from 'openapi-typescript-codegen';

const OPENAPI_DIR = resolve(__dirname, '../openapi');
const OUTPUT_DIR = resolve(OPENAPI_DIR, 'generated');

async function main() {
  // Generate TypeScript client
  await generateApi({
    input: resolve(OPENAPI_DIR, 'main.yaml'),
    output: resolve(OUTPUT_DIR, 'client'),
    httpClient: 'fetch',
    useOptions: true,
    useUnionTypes: true,
  });

  // Generate server-side code
  execSync(
    'openapi-generator-cli generate ' +
    `-i ${resolve(OPENAPI_DIR, 'main.yaml')} ` +
    `-g typescript-node ` +
    `-o ${resolve(OUTPUT_DIR, 'server')} ` +
    '--additional-properties=supportsES6=true,npmName=@api/server'
  );

  // Generate Zod schemas
  execSync(
    'typescript-to-zod ' +
    `-i ${resolve(OUTPUT_DIR, 'types')} ` +
    `-o ${resolve(OUTPUT_DIR, 'schemas')}`
  );
}

main().catch(console.error);
```

## 5. Update package.json

```json
{
  "scripts": {
    "generate-api": "ts-node scripts/generate-api.ts",
    "predev": "pnpm generate-api",
    "prebuild": "pnpm generate-api"
  }
}
```

## 6. Using Generated Code

### Frontend Route Handler Example
```typescript
// app/api/mcp/tools/route.ts
import { NextResponse } from 'next/server';
import { Tool } from '@/openapi/generated/types';
import { toolSchema } from '@/openapi/generated/schemas';
import { ApiError } from '@/lib/errors';

export async function GET() {
  try {
    const response = await fetch(`${process.env.API_URL}/mcp/tools`);
    if (!response.ok) throw new ApiError('Failed to fetch tools', response.status);
    
    const tools: Tool[] = await response.json();
    return NextResponse.json(tools);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: error instanceof ApiError ? error.status : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = toolSchema.parse(body);
    
    const response = await fetch(`${process.env.API_URL}/mcp/tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated),
    });

    if (!response.ok) throw new ApiError('Failed to create tool', response.status);
    
    const tool: Tool = await response.json();
    return NextResponse.json(tool, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: error instanceof ApiError ? error.status : 500 }
    );
  }
}
```

### React Component Example
```typescript
// components/ToolsList.tsx
import { useTools } from '@/openapi/generated/client';

export function ToolsList() {
  const { data: tools, error, isLoading } = useTools();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {tools?.map(tool => (
        <li key={tool.id}>
          <h3>{tool.name}</h3>
          <p>{tool.description}</p>
          <span>Type: {tool.type}</span>
        </li>
      ))}
    </ul>
  );
}
```

## 7. Type Safety Benefits

1. **Automatic Type Checking**:
   - API responses are fully typed
   - Request bodies are validated at compile time
   - Route parameters are type-checked

2. **IDE Support**:
   - Full autocomplete for API calls
   - Inline documentation
   - Type hints for responses

3. **Runtime Validation**:
   - Generated Zod schemas match OpenAPI spec
   - Automatic request/response validation
   - Type-safe error handling

## 8. Development Workflow

1. Update OpenAPI schema when adding/modifying endpoints
2. Run `pnpm generate-api` (or let it run automatically)
3. TypeScript compiler will show any breaking changes
4. Update implementations to match new types
5. Commit both schema and generated code

## 9. Prisma Integration

The OpenAPI generator can work directly with your Prisma schema. Here's how to integrate them:

1. **Type Generation**:
```typescript
// scripts/generate-api.ts
import { generateApi } from 'openapi-typescript-codegen';
import { PrismaClient } from '@prisma/client';

// This ensures OpenAPI types align with Prisma types
const prisma = new PrismaClient();
type PrismaTypes = typeof prisma;

await generateApi({
  input: resolve(OPENAPI_DIR, 'main.yaml'),
  output: resolve(OUTPUT_DIR, 'client'),
  httpClient: 'fetch',
  useOptions: true,
  useUnionTypes: true,
  // Map OpenAPI types to Prisma types
  typeMap: {
    'ChatMessage': 'PrismaTypes["chatMessage"]',
    'Conversation': 'PrismaTypes["conversation"]',
    'MessageReaction': 'PrismaTypes["messageReaction"]'
  }
});
```

2. **Runtime Validation**:
```typescript
// lib/validation.ts
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Helper to convert Prisma JSON to Zod schema
export const prismaJsonToZod = (json: Prisma.JsonValue) => {
  return z.custom<Prisma.JsonValue>((val) => {
    try {
      JSON.parse(JSON.stringify(val));
      return true;
    } catch {
      return false;
    }
  });
};

// Use in schemas
const messageSchema = z.object({
  metadata: prismaJsonToZod().optional(),
  // ... other fields
});
```

3. **Response Transformation**:
```typescript
// lib/transforms.ts
import type { ChatMessage } from '@prisma/client';
import type { ChatMessageResponse } from '@/openapi/generated/types';

export const transformPrismaMessage = (
  message: ChatMessage
): ChatMessageResponse => ({
  ...message,
  metadata: message.metadata as Record<string, unknown>,
  created_at: message.created_at.toISOString(),
  updated_at: message.updated_at.toISOString()
});
```

## 10. Advanced Prisma Integration

### Database Operations

1. **Transaction Handling**:
```typescript
// lib/db.ts
import { Prisma } from '@prisma/client';

// Type-safe transaction wrapper
export const withTransaction = async <T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> => {
  return prisma.$transaction(async (tx) => {
    return fn(tx);
  });
};

// Example usage in chat route
app.post('/chat', async (req, res) => {
  const result = await withTransaction(async (tx) => {
    // Create message
    const message = await tx.chatMessage.create({
      data: {
        content: req.body.content,
        role: 'user',
        conversation: {
          connectOrCreate: {
            where: { id: req.body.conversationId },
            create: { title: 'New Conversation' }
          }
        }
      }
    });

    // Update conversation
    await tx.conversation.update({
      where: { id: message.conversation_id },
      data: { last_message_at: new Date() }
    });

    return message;
  });
});
```

2. **Relation Loading with OpenAPI**:
```yaml
# openapi/schemas/common.yaml
components:
  parameters:
    Include:
      name: include
      in: query
      schema:
        type: array
        items:
          type: string
          enum: [reactions, user, conversation, replies]
        example: ["reactions", "user"]
        description: Relations to include in the response

  schemas:
    PaginatedResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Generic'
        pagination:
          type: object
          properties:
            total:
              type: integer
            hasMore:
              type: boolean
            nextCursor:
              type: string
```

3. **Query Builder**:
```typescript
// lib/query.ts
import { Prisma } from '@prisma/client';

type QueryParams = {
  include?: string[];
  orderBy?: string;
  cursor?: string;
  limit?: number;
  filter?: Record<string, unknown>;
};

export const buildPrismaQuery = (params: QueryParams) => {
  const query: Prisma.ChatMessageFindManyArgs = {
    take: params.limit || 20
  };

  // Handle includes
  if (params.include?.length) {
    query.include = params.include.reduce((acc, inc) => ({
      ...acc,
      [inc]: true
    }), {});
  }

  // Handle ordering
  if (params.orderBy) {
    const [field, direction] = params.orderBy.split(':');
    query.orderBy = { [field]: direction };
  }

  // Handle cursor pagination
  if (params.cursor) {
    query.cursor = { id: params.cursor };
    query.skip = 1; // Skip the cursor
  }

  return query;
};
```

4. **Error Handling**:
```typescript
// lib/errors.ts
import { Prisma } from '@prisma/client';

export class DatabaseError extends Error {
  constructor(
    public originalError: unknown,
    public status: number,
    message: string
  ) {
    super(message);
  }

  static fromPrismaError(error: unknown): DatabaseError {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return new DatabaseError(error, 409, 'Unique constraint violation');
        case 'P2025':
          return new DatabaseError(error, 404, 'Record not found');
        case 'P2014':
          return new DatabaseError(error, 400, 'Invalid ID provided');
        case 'P2003':
          return new DatabaseError(error, 400, 'Foreign key constraint failed');
        default:
          return new DatabaseError(error, 500, `Database error: ${error.code}`);
      }
    }
    return new DatabaseError(error, 500, 'Unknown database error');
  }
}

// Usage in route handler
try {
  const result = await prisma.chatMessage.create({...});
} catch (error) {
  const dbError = DatabaseError.fromPrismaError(error);
  return res.status(dbError.status).json({
    error: dbError.message,
    code: error instanceof Prisma.PrismaClientKnownRequestError 
      ? error.code 
      : undefined
  });
}
```

5. **Type-Safe Metadata Handling**:
```typescript
// types/metadata.ts
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Define metadata schemas
export const messageMetadataSchema = z.object({
  edited: z.boolean().optional(),
  editedAt: z.string().datetime().optional(),
  type: z.enum(['text', 'code', 'system']),
  username: z.string(),
  toolCalls: z.array(z.unknown()).optional()
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Type-safe metadata helper
export const withMetadata = <T extends { metadata?: Prisma.JsonValue }>(
  data: T,
  metadata: MessageMetadata
): T => ({
  ...data,
  metadata: metadata as Prisma.JsonValue
});

// Usage
const message = await prisma.chatMessage.create({
  data: withMetadata({
    content: 'Hello',
    role: 'user'
  }, {
    type: 'text',
    username: 'john',
    edited: false
  })
});
```

6. **Caching Integration**:
```typescript
// lib/cache.ts
import { redis } from './redis';
import { Prisma } from '@prisma/client';

export const withCache = async <T>(
  key: string,
  query: () => Promise<T>,
  options: {
    ttl?: number;
    invalidateOn?: {
      model: Prisma.ModelName;
      operation: Prisma.PrismaAction;
    }[];
  } = {}
) => {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const data = await query();
  await redis.set(key, JSON.stringify(data), 'EX', options.ttl || 300);

  // Set up invalidation triggers
  if (options.invalidateOn) {
    await redis.sadd(
      `invalidate:${options.invalidateOn.map(i => `${i.model}:${i.operation}`).join(',')}`,
      key
    );
  }

  return data;
};

// Usage
const messages = await withCache(
  `chat:${conversationId}`,
  () => prisma.chatMessage.findMany({ where: { conversation_id: conversationId } }),
  {
    ttl: 300,
    invalidateOn: [
      { model: 'ChatMessage', operation: 'create' },
      { model: 'ChatMessage', operation: 'update' }
    ]
  }
);
```

These integrations provide:
- Type-safe database operations
- Automatic relation handling
- Efficient pagination
- Proper error handling
- Type-safe metadata
- Intelligent caching

The OpenAPI schemas and Prisma models stay in sync, while the helper functions ensure type safety and maintainability.

## Next Steps

1. Add authentication schemas
2. Set up response caching
3. Add rate limiting
4. Implement error tracking
5. Add API versioning
6. Set up API documentation hosting 