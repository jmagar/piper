const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function sendMessage(message: string): Promise<string> {
    try {
        console.log('Sending message to:', `${API_BASE_URL}/chat`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
            cache: 'no-store',
            signal: controller.signal,
            mode: 'cors',
            credentials: 'include'
        }).finally(() => {
            clearTimeout(timeoutId);
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.text();
        console.log('Received response:', data);
        return data;
    } catch (error) {
        console.error('Error sending message:', error);
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                throw new Error('Unable to connect to the server. Please check your connection and try again.');
            }
            throw error;
        }
        throw new Error('An unexpected error occurred. Please try again.');
    }
} 