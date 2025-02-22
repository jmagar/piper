"use client"

import { SidebarProvider } from "@/components/ui/sidebar"

import { McpLogsViewer } from "../_components/mcp-logs-viewer"

export default function McpLogsPage() {
    return (
        <SidebarProvider>
            <McpLogsViewer />
        </SidebarProvider>
    );
} 