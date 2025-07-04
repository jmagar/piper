"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, X } from "lucide-react"
import type React from "react"

type PromptFormData = {
  name: string
  description: string
  systemPrompt: string
}

type CreatePromptFormProps = {
  formData: PromptFormData
  error: { [key: string]: string }
  isLoading: boolean
  handleInputChangeAction: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void
  handleSubmitAction: (e: React.FormEvent) => Promise<void>
  onCloseAction: () => void
  isDrawer?: boolean
}

export function CreatePromptForm({
  formData,
  error,
  isLoading,
  handleInputChangeAction,
  handleSubmitAction,
  onCloseAction,
  isDrawer = false,
}: CreatePromptFormProps) {
  return (
    <div
      className={`space-y-0 ${isDrawer ? "p-0 pb-16" : "py-0"} overflow-y-auto`}
    >
      {isDrawer && (
        <div className="border-border mb-2 flex items-center justify-between border-b px-4 pb-2">
          <h2 className="text-lg font-medium">Create prompt</h2>
          <Button variant="ghost" size="icon" onClick={onCloseAction}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="px-6 py-4">
        <div className="bg-muted/50 mb-6 rounded-lg p-3">
          <p className="text-sm">
            Prompts are reusable prompt snippets that can be @mentioned in conversations.
            They help you quickly inject common instructions or context.
          </p>
        </div>

        <form onSubmit={handleSubmitAction} className="space-y-6">
          {/* Prompt Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Prompt name</Label>
            <Input
              id="name"
              name="name"
              placeholder="My Prompt"
              value={formData.name}
              onChange={handleInputChangeAction}
              className={error.name ? "border-red-500" : ""}
            />
            <p className="text-muted-foreground text-xs">
              Used for @mentions (e.g., @my-prompt)
            </p>
            {error.name && (
              <div className="mt-1 flex items-center text-sm text-red-500">
                <AlertCircle className="mr-1 h-4 w-4" />
                <span>{error.name}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="A short description of what this prompt does"
              value={formData.description}
              onChange={handleInputChangeAction}
              className={error.description ? "border-red-500" : ""}
            />
            <p className="text-muted-foreground text-xs">
              Brief explanation visible in prompt listings
            </p>
            {error.description && (
              <div className="mt-1 flex items-center text-sm text-red-500">
                <AlertCircle className="mr-1 h-4 w-4" />
                <span>{error.description}</span>
              </div>
            )}
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">Prompt content</Label>
            <Textarea
              id="systemPrompt"
              name="systemPrompt"
              placeholder="You are a helpful assistant that specializes in..."
              value={formData.systemPrompt}
              onChange={handleInputChangeAction}
              className={`h-32 font-mono ${error.systemPrompt ? "border-red-500" : ""}`}
            />
            <p className="text-muted-foreground text-xs">
              The prompt text that will be added when this prompt is mentioned
            </p>
            {error.systemPrompt && (
              <div className="mt-1 flex items-center text-sm text-red-500">
                <AlertCircle className="mr-1 h-4 w-4" />
                <span>{error.systemPrompt}</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating Prompt..." : "Create Prompt"}
          </Button>
        </form>
      </div>
    </div>
  )
} 