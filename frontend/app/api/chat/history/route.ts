import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const params = new URLSearchParams();
        
        // Forward all query parameters
        searchParams.forEach((value, key) => {
            params.append(key, value);
        });

        const response = await fetch(`${API_URL}/chat/conversations/anonymous?${params}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch conversations: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in conversations route:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversations' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { conversationId, action } = body;

        if (!conversationId || !action) {
            return NextResponse.json(
                { error: 'Conversation ID and action are required' },
                { status: 400 }
            );
        }

        const endpoint = action === 'archive' ? 'archive' : 'unarchive';
        const response = await fetch(`${API_URL}/chat/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conversationId,
                userId: 'anonymous'
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to ${action} conversation: ${response.statusText}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`Error in ${request.method} conversations route:`, error);
        return NextResponse.json(
            { error: 'Failed to process conversation action' },
            { status: 500 }
        );
    }
} 