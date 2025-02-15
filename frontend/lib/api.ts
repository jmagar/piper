const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function sendMessage(message: string): Promise<string> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
} 