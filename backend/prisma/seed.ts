import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Create test user
    const user = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            id: 'test-user-1',
            email: 'test@example.com',
            name: 'Test User',
            preferences: {
                theme: 'light',
                notifications: true
            }
        }
    });

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
                username: 'Test User',
                type: 'text'
            }
        }
    });

    console.log('Seed completed');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 