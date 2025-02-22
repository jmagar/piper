"use client"

import { useEffect, useState } from "react"

import { formatDistanceToNow } from "date-fns"
import { BarChart, MessageSquare, Clock, ArrowUpRight } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarProvider } from "@/components/ui/sidebar"

interface UserStats {
  totalMessages: number
  averageResponseLength: number
  lastActive: string
  totalConversations: number
}

export default function StatsPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/chat/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: "Total Messages",
      value: stats?.totalMessages ?? 0,
      icon: MessageSquare,
      description: "Messages sent and received"
    },
    {
      title: "Average Response Length",
      value: stats ? Math.round(stats.averageResponseLength) : 0,
      icon: BarChart,
      description: "Characters per message"
    },
    {
      title: "Total Conversations",
      value: stats?.totalConversations ?? 0,
      icon: ArrowUpRight,
      description: "Unique chat sessions"
    },
    {
      title: "Last Active",
      value: stats?.lastActive ? formatDistanceToNow(new Date(stats.lastActive), { addSuffix: true }) : 'Never',
      icon: Clock,
      description: "Most recent activity"
    }
  ]

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 w-full p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Chat Statistics</h1>
            <p className="text-muted-foreground">Overview of your chat activity</p>
          </div>
          
          {loading ? (
            <p>Loading statistics...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  )
} 