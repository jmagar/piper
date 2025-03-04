import { Metadata } from "next";
import NewChatClient from "./client";

export const metadata: Metadata = {
  title: "New Chat | Pooper Chat",
  description: "Start a new conversation",
};

/**
 * New Chat Page (Server Component)
 * Renders the client component that uses our refactored chat components
 */
export default function NewChatPage() {
  return (
    <div className="flex flex-col h-screen">
      <NewChatClient />
    </div>
  );
} 