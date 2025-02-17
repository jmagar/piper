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

        const response = await fetch(`${API_URL}/chat/starred/anonymous?${params}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch starred messages: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in starred messages route:', error);
        return NextResponse.json(
            { error: 'Failed to fetch starred messages' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get('messageId');

        if (!messageId) {
            return NextResponse.json(
                { error: 'Message ID is required' },
                { status: 400 }
            );
        }

        const response = await fetch(`${API_URL}/chat/unstar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messageId,
                userId: 'anonymous'
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to unstar message: ${response.statusText}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in unstar message route:', error);
        return NextResponse.json(
            { error: 'Failed to unstar message' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { messageId, note } = body;

        if (!messageId) {
            return NextResponse.json(
                { error: 'Message ID is required' },
                { status: 400 }
            );
        }

        const response = await fetch(`${API_URL}/chat/star`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messageId,
                userId: 'anonymous',
                note
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to star message: ${response.statusText}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in star message route:', error);
        return NextResponse.json(
            { error: 'Failed to star message' },
            { status: 500 }
        );
    }
} 