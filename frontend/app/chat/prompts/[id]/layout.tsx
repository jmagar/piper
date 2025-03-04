import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prompt Details | Pooper",
  description: "View and manage your prompt templates",
};

export default function PromptDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 