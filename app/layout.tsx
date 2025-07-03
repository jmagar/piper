import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { OfflineIndicator } from "@/components/offline/offline-indicator"
import { InstallPrompt } from "@/components/pwa/install-prompt"
import { AgentProvider } from "@/lib/agent-store/provider"
import { ChatsProvider } from "@/lib/chat-store/chats/provider"
import { APP_DESCRIPTION, APP_NAME } from "@/lib/config"
import { getUserProfile } from "@/lib/user/api"
import { ThemeProvider } from "next-themes"
import Script from "next/script"
import { LayoutClient } from "./layout-client"
import { ChatSessionProvider } from "./providers/chat-session-provider"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { UserPreferencesProvider } from "./providers/user-preferences-provider"
import { UserProvider } from "./providers/user-provider"
import { ChatNavigation } from "./components/chat/chat-navigation"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  // Enhanced font features for better code readability
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal"],
})

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isDev = process.env.NODE_ENV === "development"
  const userProfile = await getUserProfile()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="light dark" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      {!isDev ? (
        <Script
          async
          src="https://analytics.umami.is/script.js"
          data-website-id="42e5b68c-5478-41a6-bc68-088d029cee52"
        />
      ) : null}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LayoutClient />
        <UserProvider>
          <ChatsProvider>
            <ChatSessionProvider>
              <MessagesProvider>
                <AgentProvider userId={userProfile?.id}>
                <UserPreferencesProvider>
                  <TooltipProvider delayDuration={200} skipDelayDuration={500}>
                    <ThemeProvider
                      attribute="class"
                      defaultTheme="light"
                      enableSystem
                      disableTransitionOnChange
                    >
                      <SidebarProvider defaultOpen>
                        <Toaster position="top-center" />
                        {children}
                        {/* PWA Components */}
                        <OfflineIndicator />
                        <InstallPrompt />
                        <ChatNavigation />
                      </SidebarProvider>
                    </ThemeProvider>
                  </TooltipProvider>
                </UserPreferencesProvider>
                </AgentProvider>
              </MessagesProvider>
            </ChatSessionProvider>
          </ChatsProvider>
        </UserProvider>
      </body>
    </html>
  )
}
