import { ReconnectButton } from '@/components/chat/reconnect-button';
import { ChatClient } from './client';

/**
 * Chat page - Server Component
 * Using async to properly handle dynamic route parameters
 */
export default async function ChatPage({
  params,
}: {
  params: { chatId: string };
}) {
  // Using await Promise.resolve() to handle the dynamic params properly
  // This ensures we're accessing the params in an async context as Next.js expects
  const resolvedParams = await Promise.resolve(params);
  const chatId = String(resolvedParams.chatId || 'default');
  
  return (
    <div className="flex flex-col h-full">
      {/* Debug panel with socket test links */}
      <div className="bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs sm:text-sm p-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Socket not connecting?</span>
          <span className="hidden sm:inline">Try our test pages:</span>
          <div className="flex gap-2">
            <a 
              href="/direct-socket-test.html" 
              className="underline font-bold hover:text-blue-600 dark:hover:text-blue-300"
            >
              Direct Test
            </a>
            <span>|</span>
            <a 
              href="/socket-env-test.html" 
              className="underline font-bold hover:text-blue-600 dark:hover:text-blue-300"
            >
              Env Test
            </a>
          </div>
        </div>
        <ReconnectButton />
      </div>
      
      <ChatClient chatId={chatId} />
    </div>
  );
}