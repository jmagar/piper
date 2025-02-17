import { toast } from "sonner"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4100/ws';

export type NotificationType = 'message' | 'typing' | 'status' | 'error' | 'info';

export interface Notification {
    type: NotificationType;
    title: string;
    message: string;
    timestamp: string;
    data?: unknown;
}

class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private subscribers: Set<(notification: Notification) => void> = new Set();

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        this.ws = new WebSocket(`${WS_URL}/notifications`);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            
            // Send authentication if needed
            // this.ws?.send(JSON.stringify({ type: 'auth', token: 'your-auth-token' }));
        };

        this.ws.onmessage = (event) => {
            try {
                const notification = JSON.parse(event.data) as Notification;
                this.handleNotification(notification);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.handleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    private handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            toast.error('Unable to connect to notification service. Please refresh the page.');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Attempting to reconnect in ${delay}ms...`);
        setTimeout(() => this.connect(), delay);
    }

    private handleNotification(notification: Notification) {
        // Notify all subscribers
        this.subscribers.forEach(callback => callback(notification));

        // Show toast notification based on type
        switch (notification.type) {
            case 'message':
                toast(notification.message, {
                    description: notification.title,
                });
                break;
            case 'error':
                toast.error(notification.message, {
                    description: notification.title,
                });
                break;
            case 'info':
                toast.info(notification.message, {
                    description: notification.title,
                });
                break;
            case 'typing':
                // Don't show toast for typing notifications
                break;
            case 'status':
                toast(notification.message, {
                    description: notification.title,
                });
                break;
        }
    }

    subscribe(callback: (notification: Notification) => void) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscribers.clear();
    }

    send(message: unknown) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }
}

// Create a singleton instance
export const webSocketService = new WebSocketService(); 