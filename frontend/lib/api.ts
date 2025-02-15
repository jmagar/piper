const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function sendMessage(message: string): Promise<string> {
    try {
        console.log('Sending message to:', `${API_BASE_URL}/api/chat`);
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        console.log('Received response:', text);
        return text;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
} 