import { Metadata } from "next";
import { ConfigClient } from "./client";

export const metadata: Metadata = {
  title: "MCP Configuration | Pooper",
  description: "Edit and manage Model Context Protocol configuration",
};

/**
 * MCP Config Page - Server Component
 * This page displays and allows editing of the MCP configuration
 */
export default function ConfigPage() {
  return <ConfigClient />;
} 