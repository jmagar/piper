import "./globals.css"
import { Inter } from "next/font/google"
import { Metadata, Viewport } from "next"
import ClientLayout from "./client-layout"

// Load Inter font with latin subset for optimal performance
const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap", // Optimize font loading
})

export const metadata: Metadata = {
  title: "Pooper AI Chat",
  description: "AI-powered chat for document assistance",
  icons: {
    icon: "/favicon.ico",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
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
      <body className={`${inter.variable} font-sans antialiased min-h-screen text-foreground bg-background`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
} 