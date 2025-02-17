import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messageId, userId, note } = body;

        if (!messageId || !userId) {
            return NextResponse.json(
                { error: "Invalid request. Requires messageId and userId" },
                { status: 400 }
            );
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100'}/chat/star`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messageId, userId, note }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error starring message:', error);
        return NextResponse.json(
            { error: "Failed to star message" },
            { status: 500 }
        );
    }
} 