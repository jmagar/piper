import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Viewport } from "next";

// Import the client component
import NewChatClient from "./client";

export const metadata: Metadata = {
  title: "New Chat | Pooper Chat",
  description: "Start a new conversation",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" }
  ],
};

/**
 * Page component for creating a new chat
 * 
 * @returns New chat page with client component
 */
export default async function NewChatPage() {
  // Server-side operations could be performed here
  // For example, checking authentication, fetching user data, etc.

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl h-full">
      <NewChatClient />
    </div>
  );
} 