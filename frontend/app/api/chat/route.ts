import { NextResponse } from 'next/server';
import { z } from 'zod';

// Message validation schema
const messageSchema = z.object({
    content: z.string().min(1, "Message content is required"),
    userId: z.string(),
    username: z.string(),
    conversationId: z.string().optional(),
    timestamp: z.string().optional(),
    type: z.enum(['text', 'code', 'system']).default('text'),
    metadata: z.record(z.unknown()).optional(),
    role: z.enum(['user', 'assistant']).default('user'),
});

// Helper function to make API requests to backend
async function fetchFromBackend(endpoint: string, options: RequestInit = {}) {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100'}/chat${endpoint}`;
    console.log(`Fetching from: ${url}`);
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
        });
        throw new Error(`Backend error: ${errorText}`);
    }

    return response;
}

export async function POST(req: Request) {
    try {
        console.log('Received request to /api/chat');
        const body = await req.json();
        
        // Validate message
        const result = messageSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Invalid message format", details: result.error.format() },
                { status: 400 }
            );
        }

        // Format message for backend
        const message = {
            message: result.data.content,
            userId: result.data.userId,
            username: result.data.username,
            conversationId: result.data.conversationId,
            role: result.data.role,
            type: result.data.type,
            timestamp: result.data.timestamp || new Date().toISOString(),
            metadata: result.data.metadata || {}
        };

        // Send to backend
        const response = await fetchFromBackend('', {
            method: 'POST',
            body: JSON.stringify(message),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error processing message:', error);
        return NextResponse.json(
            { error: "Failed to process message" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const conversationId = searchParams.get('conversationId');
        const cursor = searchParams.get('cursor');
        const limit = searchParams.get('limit') || '20';
        const search = searchParams.get('search');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const threadId = searchParams.get('threadId');

        // Build query params
        const queryParams = new URLSearchParams();
        if (conversationId) queryParams.append('conversationId', conversationId);
        if (cursor) queryParams.append('cursor', cursor);
        if (limit) queryParams.append('limit', limit);
        if (search) queryParams.append('search', search);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        if (threadId) queryParams.append('threadId', threadId);

        const endpoint = `/messages?${queryParams.toString()}`;
        const response = await fetchFromBackend(endpoint);
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json(
            { error: "Failed to fetch messages" },
            { status: 500 }
        );
    }
}

// Starred messages endpoints
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { messageId, action } = body;

        if (!messageId || !action || !['star', 'unstar'].includes(action)) {
            return NextResponse.json(
                { error: "Invalid request. Requires messageId and action (star/unstar)" },
                { status: 400 }
            );
        }

        const response = await fetchFromBackend(`/messages/${messageId}/${action}`, {
            method: 'PUT',
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating message star status:', error);
        return NextResponse.json(
            { error: "Failed to update message" },
            { status: 500 }
        );
    }
}

// CORS is handled by Next.js middleware
export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}

