# PostgreSQL Integration Plan

## Overview
PostgreSQL serves as our primary persistent storage, handling all long-term data storage needs. This document outlines our database design and implementation strategy.

## Database Schema Design

### 1. Core Entities

#### Users & Preferences
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    theme VARCHAR(10) NOT NULL DEFAULT 'system',
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT theme_values CHECK (theme IN ('light', 'dark', 'system'))
);
```

#### Conversations & Messages
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    role VARCHAR(10) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT role_values CHECK (role IN ('user', 'assistant'))
);

-- Indexes for performance
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_metadata ON messages USING gin(metadata);
```

#### Tool Usage Tracking
```sql
CREATE TABLE tool_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id),
    tool_name VARCHAR(50) NOT NULL,
    input JSONB NOT NULL,
    output JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT status_values CHECK (status IN ('pending', 'success', 'error'))
);

CREATE INDEX idx_tool_executions_tool_name ON tool_executions(tool_name);
CREATE INDEX idx_tool_executions_message_id ON tool_executions(message_id);
```

### 2. Triggers & Functions

#### Updated At Trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Similar triggers for other tables
```

#### Message Creation Trigger
```sql
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();
```

## Implementation Strategy

### 1. Connection Management

#### Connection Pool Configuration
```typescript
const POOL_CONFIG = {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    maxUses: 7500, // Prevent memory leaks
};
```

#### Health Check Query
```sql
SELECT 1 as health_check;
```

### 2. Data Access Patterns

#### Repository Pattern
```typescript
export class MessageRepository {
    async create(message: NewMessage): Promise<Message> {
        return await prisma.message.create({
            data: {
                ...message,
                metadata: message.metadata || {}
            }
        });
    }

    async getConversationMessages(
        conversationId: string,
        options: PaginationOptions
    ): Promise<Message[]> {
        return await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: options.limit,
            skip: options.offset
        });
    }
}
```

#### Transaction Management
```typescript
async function createMessageWithTools(
    message: NewMessage,
    toolExecutions: ToolExecution[]
): Promise<Message> {
    return await prisma.$transaction(async (tx) => {
        const msg = await tx.message.create({
            data: message
        });

        await tx.toolExecution.createMany({
            data: toolExecutions.map(te => ({
                ...te,
                messageId: msg.id
            }))
        });

        return msg;
    });
}
```

### 3. Error Handling & Retries
```typescript
async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (!isRetryableError(error)) throw error;
            await delay(Math.pow(2, i) * 100);
        }
    }
    
    throw lastError;
}
```

## Monitoring & Maintenance

### 1. Performance Monitoring

#### Slow Query Logging
```sql
ALTER SYSTEM SET log_min_duration_statement = '1000';  -- Log queries taking > 1s
```

#### Index Usage Tracking
```sql
SELECT 
    schemaname,
    relname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM 
    pg_stat_user_indexes;
```

### 2. Maintenance Tasks

#### Vacuum Settings
```sql
ALTER TABLE messages SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);
```

#### Regular Maintenance
```sql
-- Remove old messages
DELETE FROM messages 
WHERE created_at < NOW() - INTERVAL '1 year'
AND conversation_id NOT IN (
    SELECT id FROM conversations 
    WHERE updated_at > NOW() - INTERVAL '1 year'
);
```

## Backup & Recovery

### 1. Backup Strategy
```bash
# Physical backup
pg_basebackup -D backup -Ft -z -P

# Logical backup
pg_dump -Fc -f backup.dump dbname
```

### 2. Point-in-Time Recovery
```sql
-- Enable WAL archiving
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'cp %p /archive/%f';
```

## Security Considerations

### 1. Access Control
```sql
-- Create read-only role
CREATE ROLE readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- Create application role
CREATE ROLE app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
```

### 2. Data Protection
```sql
-- Enable row-level security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY message_access_policy ON messages
    USING (conversation_id IN (
        SELECT conversation_id 
        FROM conversation_participants 
        WHERE user_id = current_user_id()
    ));
```

## Migration Strategy

### 1. Forward Migrations
```typescript
// prisma/migrations/YYYYMMDDHHMMSS_add_message_metadata/
export const up = async (prisma: PrismaClient) => {
    await prisma.$executeRaw`
        ALTER TABLE messages
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    `;
};
```

### 2. Rollback Migrations
```typescript
export const down = async (prisma: PrismaClient) => {
    await prisma.$executeRaw`
        ALTER TABLE messages
        DROP COLUMN metadata;
    `;
};
```
