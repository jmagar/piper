"use client";

import * as React from "react";
import { 
  Sidebar, 
  SidebarItem,
  SidebarSection
} from "@/components/layout/sidebar";
import { 
  Home, 
  MessageCircle,
  PlusCircle, 
  Star, 
  Github, 
  FileText,
  BookOpen,
  Search,
  Bot,
  LayoutDashboard,
  MessagesSquare,
  Lightbulb,
  Library,
  Sparkles,
  Settings,
  FileCode,
  ServerCrash
} from "lucide-react";

/**
 * The application's main sidebar component
 * Uses the sidebar components with categorized navigation structure
 */
export function AppSidebar() {
  return (
    <Sidebar>
      {/* Logo/Brand section */}
      <div className="p-4 flex justify-center">
        <div className="text-xl font-semibold">AI Chat</div>
      </div>
      
      {/* Main navigation divided into logical sections */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {/* General section */}
        <SidebarSection 
          title="General"
          icon={LayoutDashboard}
        >
          <SidebarItem
            title="Dashboard"
            href="/dashboard"
            icon={Home}
          />
          
          <SidebarItem
            title="Prompts"
            href="/prompts"
            icon={Sparkles}
          />
        </SidebarSection>
        
        {/* Chat section */}
        <SidebarSection 
          title="Chat"
          icon={MessagesSquare}
        >
          <SidebarItem 
            title="New Conversation" 
            href="/chat/new"
            icon={PlusCircle} 
          />
          
          <SidebarItem 
            title="My Conversations" 
            href="/chat/history"
            icon={MessageCircle} 
          />
          
          <SidebarItem 
            title="Starred" 
            href="/chat/starred"
            icon={Star} 
          />
        </SidebarSection>
        
        {/* Model Context Protocol section */}
        <SidebarSection 
          title="Model Context Protocol"
          icon={Bot}
        >
          <SidebarItem 
            title="Logs" 
            href="/mcp/logs"
            icon={FileCode} 
          />
          
          <SidebarItem 
            title="Config" 
            href="/mcp/config"
            icon={Settings} 
          />
          
          <SidebarItem 
            title="Servers" 
            href="/mcp/servers"
            icon={ServerCrash} 
          />
        </SidebarSection>
        
        {/* Knowledge section (was Learn) */}
        <SidebarSection 
          title="Knowledge"
          icon={Lightbulb}
        >
          <SidebarItem 
            title="Documents" 
            href="/knowledge/documents"
            icon={BookOpen} 
          />
          
          <SidebarItem 
            title="Search" 
            href="/knowledge/search"
            icon={Search} 
          />
        </SidebarSection>
        
        {/* Resources section */}
        <SidebarSection 
          title="Resources"
          icon={Library}
        >
          <SidebarItem 
            title="Github" 
            href="https://github.com/example/repo"
            icon={Github}
            isExternal
          />
          
          <SidebarItem 
            title="Documentation" 
            href="/docs"
            icon={FileText}
          />
        </SidebarSection>
      </div>
    </Sidebar>
  );
} 