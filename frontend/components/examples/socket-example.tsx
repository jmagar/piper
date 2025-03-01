import * as React from 'react';
import { Button } from '@/components/ui/button';
import { SocketProvider } from '@/lib/socket/socket-provider';
import { SocketStatus } from '@/components/ui/socket-status';
import { SocketTools } from '@/components/ui/socket-tools';
import { useSocketEmit } from '@/lib/socket/use-socket-emit';
import { useSocketEvent } from '@/lib/socket/use-socket-event';
import { logEvent } from '@/lib/utils/logger';

interface SocketExampleProps {
  socketUrl?: string;
}

/**
 * Example component demonstrating socket integration
 */
export function SocketExample({ socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL }: SocketExampleProps) {
  const [messages, setMessages] = React.useState<string[]>([]);
  const [inputMessage, setInputMessage] = React.useState('');
  
  // Configure socket options
  const socketOptions = React.useMemo(() => ({
    url: socketUrl,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    autoConnect: true,
    userId: 'example-user',
    username: 'Example User'
  }), [socketUrl]);
  
  return (
    <SocketProvider options={socketOptions}>
      <div className="w-full max-w-md mx-auto border rounded-lg shadow-sm p-6 bg-white">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold leading-none tracking-tight">Socket.IO Example</h3>
            <SocketStatus size="md" />
          </div>
          <p className="text-sm text-muted-foreground">
            Demonstrates how to use socket hooks with Socket.IO
          </p>
        </div>
        
        <div className="my-4">
          <ChatMessages messages={messages} setMessages={setMessages} />
          <ChatInput 
            value={inputMessage} 
            onChange={setInputMessage} 
            onSend={() => {
              if (inputMessage.trim()) {
                setMessages(prev => [...prev, `You: ${inputMessage}`]);
                setInputMessage('');
              }
            }} 
          />
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {messages.length === 0 ? 'No messages yet' : `${messages.length} messages`}
          </div>
          
          {/* Socket Tools (combined status and debug) */}
          <SocketTools 
            position="bottom-right"
            showStatus={true}
            showDebug={true}
          />
        </div>
      </div>
    </SocketProvider>
  );
}

interface ChatMessagesProps {
  messages: string[];
  setMessages: React.Dispatch<React.SetStateAction<string[]>>;
}

function ChatMessages({ messages, setMessages }: ChatMessagesProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Setup socket event listener for incoming messages
  useSocketEvent<{ text: string; sender: string }>('chat:message', (data) => {
    logEvent('debug', 'Received chat message', data);
    setMessages(prev => [...prev, `${data.sender}: ${data.text}`]);
  }, [setMessages]);
  
  // Auto-scroll to bottom when messages update
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="h-64 overflow-y-auto p-3 border rounded-md mb-4">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((message, i) => (
            <div key={i} className="text-sm">
              {message}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

function ChatInput({ value, onChange, onSend }: ChatInputProps) {
  // Setup socket emit function
  const emitMessage = useSocketEmit();
  
  const handleSend = () => {
    if (value.trim()) {
      // Emit the message to the server
      emitMessage<{ text: string }, { success: boolean }>('chat:send', { text: value.trim() }, true, 5000)
        .then(response => {
          logEvent('debug', 'Message sent successfully', response);
          onSend();
        })
        .catch(error => {
          logEvent('error', 'Failed to send message', error);
        });
    }
  };
  
  return (
    <div className="flex space-x-2">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            handleSend();
          }
        }}
        className="flex-1 px-3 py-2 border rounded-md"
        placeholder="Type a message..."
      />
      <Button onClick={handleSend}>Send</Button>
    </div>
  );
} 