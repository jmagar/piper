import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messageId, userId, reactions } = body;

        if (!messageId || !userId || !Array.isArray(reactions)) {
            return NextResponse.json(
                { error: "Invalid request. Requires messageId, userId, and reactions array" },
                { status: 400 }
            );
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100'}/messages/reactions/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messageId, userId, reactions }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating reactions:', error);
        return NextResponse.json(
            { error: "Failed to update reactions" },
            { status: 500 }
        );
    }
} 