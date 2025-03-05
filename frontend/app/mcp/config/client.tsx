"use client";

import * as React from "react";
import { MCPConfigProvider } from "@/components/mcp/config/mcp-config-provider";
import { MCPConfigEditor } from "@/components/mcp/config/mcp-config-editor";

/**
 * Client-side MCP Config Page component
 */
export function ConfigClient() {
  return (
    <MCPConfigProvider>
      <MCPConfigEditor />
    </MCPConfigProvider>
  );
}