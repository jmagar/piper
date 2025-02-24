import "./globals.css"
import { Inter } from "next/font/google"
import { Metadata } from "next"
import { RootLayoutClient } from "@/components/root-layout-client"

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
      <head />
      <body className={inter.variable}>
        <RootLayoutClient>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  )
}
