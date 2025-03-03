import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');
    
    // Create admin user
    const user = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {
            // Ensure ID is admin even if user already exists
            id: 'admin',
            name: 'Administrator',
            preferences: {
                theme: 'light',
                notifications: true
            }
        },
        create: {
            id: 'admin',
            email: 'admin@example.com',
            name: 'Administrator',
            preferences: {
                theme: 'light',
                notifications: true
            }
        }
    });

    console.log(`Created user: ${user.name} (${user.email}) with ID: ${user.id}`);

    // Create user stats
    await prisma.userStats.upsert({
        where: { user_id: user.id },
        update: {},
        create: {
            user_id: user.id,
            total_conversations: 0,
            total_messages: 0,
            total_starred: 0,
            average_response_length: 0,
            last_active: new Date()
        }
    });

    // Create initial conversation
    const conversation = await prisma.conversation.upsert({
        where: { id: 'initial-conversation' },
        update: {},
        create: {
            id: 'initial-conversation',
            title: 'First Conversation',
            user_id: user.id,
            last_message_at: new Date()
        }
    });

    console.log(`Created conversation: ${conversation.title}`);

    // Create conversation stats
    await prisma.conversationStats.upsert({
        where: { conversation_id: conversation.id },
        update: {},
        create: {
            conversation_id: conversation.id,
            message_count: 0,
            user_message_count: 0,
            bot_message_count: 0,
            average_response_time: 0,
            tool_usage_count: 0
        }
    });

    // Create test message
    await prisma.chatMessage.upsert({
        where: { id: 'test-message' },
        update: {},
        create: {
            id: 'test-message',
            content: 'Hello, this is a test message',
            role: 'user',
            conversation_id: conversation.id,
            user_id: user.id,
            metadata: {
                username: 'admin',
                type: 'text'
            }
        }
    });

    // Create MCP server
    const mcpServer = await prisma.mcpServer.upsert({
        where: { id: 'clr3z1qw50000z1g5gqpg4x3c' },
        update: {},
        create: {
            id: 'clr3z1qw50000z1g5gqpg4x3c',
            name: 'Primary MCP Server',
            url: 'http://localhost:4100/api/mcp',
            type: 'primary',
            status: 'active',
            metadata: {
                version: '1.0.0',
                capabilities: ['text', 'image', 'code', 'data'],
            }
        }
    });

    console.log(`Created MCP server: ${mcpServer.name}`);

    // Create MCP tools
    await prisma.mcpTool.upsert({
        where: { id: 'clr3z1qw50001z1g5gqpg4x3d' },
        update: {},
        create: {
            id: 'clr3z1qw50001z1g5gqpg4x3d',
            name: 'web_search',
            description: 'Search the web for information',
            type: 'system',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The search query',
                    },
                },
                required: ['query'],
            },
            serverId: 'clr3z1qw50000z1g5gqpg4x3c'
        }
    });

    console.log('✅ Seed completed successfully');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding the database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 