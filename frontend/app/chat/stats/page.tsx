import * as React from 'react';
import { Metadata } from 'next';

/**
 * Generate metadata for this page
 */
export const metadata: Metadata = {
  title: 'Chat Statistics',
  description: 'View your chat usage statistics',
};

/**
 * Interface for user statistics
 */
interface UserStats {
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  botMessages: number;
  toolUsages: number;
  averageMessagesPerConversation: number;
  averageResponseTime: number; // in seconds
  mostActiveDay: string;
  mostUsedTools: Array<{ name: string; count: number }>;
}

/**
 * Server-side props for the stats page
 */
async function getServerSideProps() {
  try {
    // Fetch user statistics
    // This would be replaced with actual API call
    const stats: UserStats = {
      totalConversations: 24,
      totalMessages: 456,
      userMessages: 220,
      botMessages: 236,
      toolUsages: 88,
      averageMessagesPerConversation: 19,
      averageResponseTime: 2.4,
      mostActiveDay: 'Wednesday',
      mostUsedTools: [
        { name: 'Web Search', count: 34 },
        { name: 'Code Analysis', count: 28 },
        { name: 'Image Generation', count: 14 },
        { name: 'Data Visualization', count: 12 }
      ]
    };
    
    return { stats };
  } catch (error) {
    console.error('Error loading chat statistics:', error);
    return { 
      stats: {
        totalConversations: 0,
        totalMessages: 0,
        userMessages: 0,
        botMessages: 0,
        toolUsages: 0,
        averageMessagesPerConversation: 0,
        averageResponseTime: 0,
        mostActiveDay: 'N/A',
        mostUsedTools: []
      } 
    };
  }
}

/**
 * Stats page component that displays usage statistics
 */
export default async function StatsPage() {
  const { stats } = await getServerSideProps();
  
  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Chat Statistics</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Stats Cards */}
        <StatCard title="Total Conversations" value={stats.totalConversations} />
        <StatCard title="Total Messages" value={stats.totalMessages} />
        <StatCard title="Your Messages" value={stats.userMessages} />
        <StatCard title="AI Responses" value={stats.botMessages} />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Metrics Cards */}
        <div className="rounded-lg border p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Engagement Metrics</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-500">Avg. Messages Per Chat</dt>
              <dd className="font-medium">{stats.averageMessagesPerConversation}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Avg. Response Time</dt>
              <dd className="font-medium">{stats.averageResponseTime.toFixed(1)}s</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tool Usages</dt>
              <dd className="font-medium">{stats.toolUsages}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Most Active Day</dt>
              <dd className="font-medium">{stats.mostActiveDay}</dd>
            </div>
          </dl>
        </div>
        
        <div className="rounded-lg border p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Most Used Tools</h2>
          {stats.mostUsedTools.length > 0 ? (
            <div className="space-y-3">
              {stats.mostUsedTools.map((tool, index) => (
                <div key={index} className="flex flex-col">
                  <div className="flex justify-between mb-1">
                    <span>{tool.name}</span>
                    <span className="font-medium">{tool.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full"
                      style={{ 
                        width: `${(tool.count / Math.max(...stats.mostUsedTools.map(t => t.count))) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No tools used yet</p>
          )}
        </div>
      </div>
      
      <div className="rounded-lg border p-4 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Usage Over Time</h2>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">Chart visualization would go here</p>
        </div>
      </div>
      
      <div className="text-center">
        <a 
          href="/chat/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Start a new chat
        </a>
      </div>
    </div>
  );
}

/**
 * Stat card component
 */
function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
} 