"use client"

import { TerminalEmulator } from "@/components/terminal-emulator"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function TerminalPage() {
    return (
        <SidebarProvider>
            <div className="flex h-screen w-full">
                <AppSidebar />
                <main className="flex-1 w-full overflow-hidden">
                    <div className="h-full flex flex-col bg-background">
                        <div className="p-4 border-b flex items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
                            <h2 className="text-lg font-semibold">Terminal</h2>
                            <span className="text-sm text-muted-foreground">Project directory: ~/code/pooper</span>
                        </div>
                        <div className="flex-1 p-4">
                            <div className="w-full h-full rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                                <TerminalEmulator />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </SidebarProvider>
    )
} 