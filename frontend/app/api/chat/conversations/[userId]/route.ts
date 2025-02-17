import { NextRequest, NextResponse } from "next/server"

export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100'}/chat/conversations/${params.userId}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('Backend error:', {
                status: response.status,
                statusText: response.statusText,
                body: error
            });
            throw new Error(error);
        }

        const data = await response.json();
        // Return just the conversations array since that's what the frontend expects
        return NextResponse.json(data.conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversations' },
            { status: 500 }
        );
    }
} 