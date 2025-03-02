import { Metadata, Viewport } from 'next';

/**
 * Generate metadata for this page
 */
export const metadata: Metadata = {
  title: 'Chat',
  description: 'Chat with your AI assistant',
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}