"use client"

import { McpLogsViewer } from "../_components/mcp-logs-viewer"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function McpLogsPage() {
    return (
        <SidebarProvider>
            <McpLogsViewer />
        </SidebarProvider>
    );
} 