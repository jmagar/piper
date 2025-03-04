import { Metadata } from "next";
import { LogViewerClient } from "./client";

export const metadata: Metadata = {
  title: "MCP Log Viewer | Pooper",
  description: "Monitor and filter logs from MCP servers in real-time",
};

/**
 * MCP Log Viewer Page - Server Component
 * This is the server component that renders the client component
 */
export default function LogViewerPage() {
  return <LogViewerClient />;
} 