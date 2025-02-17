import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Create test user
    const user = await prisma.user.create({
        data: {
            email: 'test@example.com',
            name: 'Test User',
            preferences: {
                theme: 'dark',
                notifications: true,
                language: 'en'
            }
        }
    });
    console.log('Created test user:', user);

    // Create a test conversation
    const conversation = await prisma.conversation.create({
        data: {
            title: 'Test Conversation',
            user: {
                connect: { id: user.id }
            },
            messages: {
                create: [
                    {
                        role: 'user',
                        content: 'What\'s the weather like in San Francisco?',
                        user: {
                            connect: { id: user.id }
                        },
                        metadata: {
                            liked: true,
                            tool_calls: [
                                {
                                    tool: 'weather',
                                    input: 'San Francisco',
                                    result: 'Currently 72°F and sunny'
                                }
                            ]
                        }
                    },
                    {
                        role: 'assistant',
                        content: 'According to the weather service, it\'s currently 72°F and sunny in San Francisco.',
                        metadata: {
                            liked: true
                        }
                    }
                ]
            }
        },
        include: {
            messages: true
        }
    });
    console.log('Created conversation with messages:', conversation);

    // Create tool result cache entries
    const toolResult = await prisma.toolResult.create({
        data: {
            tool_name: 'weather',
            input_hash: Buffer.from('San Francisco').toString('base64'),
            result: {
                temperature: 72,
                condition: 'sunny',
                location: 'San Francisco, CA'
            },
            expires_at: new Date(Date.now() + 1000 * 60 * 15) // 15 minutes from now
        }
    });
    console.log('Created tool result cache:', toolResult);
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 