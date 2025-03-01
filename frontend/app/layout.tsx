import "./globals.css"
import { Inter } from "next/font/google"
import { Metadata } from "next"
import { ThemeProvider } from "@/components/shared/theme-provider"
import { Toaster } from "sonner"
import { cn } from "@/lib/utils"
import { EnvProvider } from "./env-provider"
import { SocketProvider } from "@/lib/socket-setup"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Pooper Chat",
  description: "A modern chat application",
}

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
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <EnvProvider />
          <SocketProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 