import { Attachment as AISDKAttachment } from "@ai-sdk/ui-utils"

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Chat {
  id: string
  title: string
  model?: string | null
  systemPrompt?: string | null
  agentId?: string | null
  createdAt: Date
  updatedAt: Date
  messages?: Message[]
  attachments?: Attachment[]
}

export interface Message {
  id: string
  chatId: string
  content: string
  parts?: unknown // JSON field for structured message parts (step badges, tool calls, etc.)
  role: string
  createdAt: Date
  chat?: Chat
}

export interface Attachment {
  id: string
  chatId: string
  fileName: string
  fileType: string
  fileSize: number
  filePath: string
  createdAt: Date
  chat?: Chat
}

// Agent interface for admin-only mode
export interface Agent {
  id: string
  name: string
  description: string
  slug: string
  avatar_url?: string | null
  system_prompt?: string | null
  tools?: string[] | null
  example_inputs?: string[] | null
  mcp_config?: Json | null
  creator_id: string
  createdAt: Date
  updatedAt: Date
}

// User interface for admin-only mode
export interface User {
  id: string
  display_name: string
  profile_image: string
  system_prompt?: string | null
  anonymous?: boolean
  createdAt: Date
  updatedAt: Date
}

// Export the AI SDK Attachment type for use in other files
export type { AISDKAttachment }

// Legacy type aliases for compatibility during migration
export type Database = {
  public: {
    Tables: {
      chats: {
        Row: Chat
        Insert: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'createdAt'>
        Update: Partial<Omit<Message, 'id' | 'createdAt'>>
      }
      attachments: {
        Row: Attachment
        Insert: Omit<Attachment, 'id' | 'createdAt'>
        Update: Partial<Omit<Attachment, 'id' | 'createdAt'>>
      }
      agents: {
        Row: Agent
        Insert: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
