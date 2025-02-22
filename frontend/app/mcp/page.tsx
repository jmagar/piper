import { Suspense } from 'react';

import { McpServersList } from '@/components/mcp-servers-list';

import { McpToolsList } from './_components/mcp-tools-list';

export default function MCPPage() {
    return (
        <div className="container mx-auto p-4">
            <h1 className="mb-8 text-2xl font-bold">MCP Servers</h1>
            
            <div className="grid gap-8">
                <Suspense fallback={<div>Loading servers...</div>}>
                    <McpServersList />
                </Suspense>

                <Suspense fallback={<div>Loading tools...</div>}>
                    <McpToolsList />
                </Suspense>
            </div>
        </div>
    );
}