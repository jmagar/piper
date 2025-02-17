import { NextResponse } from 'next/server';

// This is the backend server URL
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';
console.log('BACKEND_URL:', BACKEND_URL);

export async function POST(req: Request) {
    try {
        console.log('Received request to /api/chat');
        const body = await req.json();
        const { message } = body;
        console.log('Message:', message);

        if (!message) {
            console.log('No message provided');
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        console.log('Attempting to fetch from:', `${BACKEND_URL}/chat`);
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
            cache: 'no-store',
        }).catch((error: Error) => {
            console.error('Fetch error details:', {
                message: error.message,
                cause: error.cause,
                stack: error.stack
            });
            throw error;
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            return NextResponse.json({ 
                error: 'Internal server error',
                details: errorText
            }, { status: 500 });
        }

        const text = await response.text();
        console.log('Successfully received response:', text.substring(0, 100) + '...');
        return new NextResponse(text, {
            headers: {
                'Content-Type': 'text/plain',
            },
        });
    } catch (error) {
        console.error('Error in chat route:', {
            error: error instanceof Error ? {
                message: error.message,
                cause: (error as Error).cause,
                stack: error.stack
            } : error
        });
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// CORS is handled by Next.js middleware, so we don't need explicit CORS headers here
export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}

