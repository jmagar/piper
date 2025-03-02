import "./globals.css"
import { Inter } from "next/font/google"
import { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/shared/theme-provider"
import { Toaster } from "sonner"
import { cn } from "../lib/utils"
import { EnvProvider } from "./env-provider"
import { SocketProvider } from "@/lib/socket-setup.js"
import { AppErrorBoundary } from "@/components/shared/error-boundary"

// Load Inter font with latin subset for optimal performance
const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  display: "swap", // Optimize font loading
})

export const metadata: Metadata = {
  title: "Pooper Chat",
  description: "A modern chat application",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" }
  ],
}

/**
 * Root layout component for the application
 * Implements providers and global styling
 *
 * @param props - Component props
 * @param props.children - Child components to render
 * @returns Root layout with providers and children
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* No direct scripts here - they cause conflicts */}
      </head>
      <body className={cn(
        inter.variable, 
        "font-sans antialiased min-h-screen",
        "text-foreground bg-background",
      )}>
        <AppErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <EnvProvider />
            <SocketProvider>
              {children}
              <Toaster 
                position="bottom-right" 
                richColors 
                closeButton
                toastOptions={{
                  className: "max-w-[90vw] sm:max-w-md",
                }}
              />
            </SocketProvider>
          </ThemeProvider>
        </AppErrorBoundary>
      </body>
    </html>
  )
} 