import * as React from 'react';
import { Button } from '@/components/ui/button';

/**
 * A simple example component demonstrating socket functionality
 */
export function SocketExample() {
  const [messages, setMessages] = React.useState<Array<{ text: string; sender: string }>>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [isConnected, setIsConnected] = React.useState(false);
  
  // Simulate connection on mount
  React.useEffect(() => {
    // Simulate connection after 1 second
    const timer = setTimeout(() => {
      setIsConnected(true);
      setMessages(prev => [...prev, { 
        text: 'Connected to server', 
        sender: 'system' 
      }]);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Function to handle sending messages
  const sendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { 
      text: inputValue, 
      sender: 'user' 
    }]);
    
    // Simulate server response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: `Echo: ${inputValue}`, 
        sender: 'server' 
      }]);
    }, 500);
    
    setInputValue('');
  };
  
  return (
    <div className="flex flex-col space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Socket Example</h2>
        <div className="text-sm">
          Connection Status: 
          <span className={`ml-2 font-medium ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-2 border rounded-lg min-h-[200px] max-h-[400px]">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`mb-2 p-2 rounded-lg ${
              msg.sender === 'user' 
                ? 'bg-blue-100 ml-auto max-w-[80%]' 
                : msg.sender === 'system'
                  ? 'bg-gray-100 text-center w-full italic text-sm'
                  : 'bg-green-100 mr-auto max-w-[80%]'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      
      <div className="flex space-x-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded-lg"
          disabled={!isConnected}
        />
        <Button 
          onClick={sendMessage}
          disabled={!isConnected || !inputValue.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  );
} 