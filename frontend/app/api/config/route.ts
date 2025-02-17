import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

export async function GET() {
    try {
        const response = await fetch(`${API_URL}/api/config`, {
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch config: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in config route:', error);
        return NextResponse.json(
            { error: 'Failed to fetch config' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { model, provider } = body;

        if (!model || !provider) {
            return NextResponse.json(
                { error: 'Model and provider are required' },
                { status: 400 }
            );
        }

        // TODO: Implement updating the config file
        // For now, just return success
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in config route:', error);
        return NextResponse.json(
            { error: 'Failed to update config' },
            { status: 500 }
        );
    }
} 