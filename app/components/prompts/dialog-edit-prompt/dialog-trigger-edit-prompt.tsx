"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription as VaulDrawerDescription,
  DrawerHeader as VaulDrawerHeader,
  DrawerTitle as VaulDrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { toast } from "@/components/ui/toast"
import { fetchClient } from "@/lib/fetch"
import { useRouter } from "next/navigation"
import type React from "react"
import { useState, useEffect } from "react"
import { useBreakpoint } from "../../../hooks/use-breakpoint"
import { EditPromptForm } from "./edit-prompt-form"

type PromptFormData = {
  name: string
  description: string
  systemPrompt: string
}

type DialogEditPromptTriggerProps = {
  trigger: React.ReactNode
  promptData: {
    id: string
    slug: string
    name: string
    description: string
    system_prompt: string
  }
  onPromptUpdatedAction?: () => void
}

export function DialogEditPromptTrigger({
  trigger,
  promptData,
  onPromptUpdatedAction,
}: DialogEditPromptTriggerProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<PromptFormData>({
    name: "",
    description: "",
    systemPrompt: "",
  })
  const [error, setError] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const isMobile = useBreakpoint(768)

  // Pre-populate form data when dialog opens
  useEffect(() => {
    if (open && promptData) {
      setFormData({
        name: promptData.name,
        description: promptData.description,
        systemPrompt: promptData.system_prompt,
      })
    }
  }, [open, promptData])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Clear error for this field if it exists
    if (error[name]) {
      setError({ ...error, [name]: "" })
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = "Prompt name is required"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    }

    if (!formData.systemPrompt.trim()) {
      newErrors.systemPrompt = "Prompt content is required"
    }

    setError(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const apiResponse = await fetchClient(`/api/update-prompt/${promptData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          systemPrompt: formData.systemPrompt.trim(),
        }),
      })

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json()
        throw new Error(errorData.error || "Failed to update prompt")
      }

      await apiResponse.json()
      toast({ title: "Prompt updated successfully!", status: "success" })
      setOpen(false)
      
      // Call the callback to refresh rule data if provided
      if (onPromptUpdatedAction) {
        onPromptUpdatedAction()
      }
      
      // Refresh the current page to reflect changes
      router.refresh()
    } catch (err: unknown) {
      let errorMessage = "An unexpected error occurred."
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      toast({ title: "Error updating prompt", description: errorMessage, status: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const content = (
    <EditPromptForm
      formData={formData}
      error={error}
      isLoading={isLoading}
      handleInputChangeAction={handleInputChange}
      handleSubmitAction={handleSubmit}
      onCloseAction={() => setOpen(false)}
      isDrawer={isMobile}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <VaulDrawerHeader className="text-left">
            <VaulDrawerTitle>Edit prompt</VaulDrawerTitle>
            <VaulDrawerDescription>
              Update your prompt&apos;s name, description, and prompt content.
            </VaulDrawerDescription>
          </VaulDrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <div
          className="h-full w-full"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DialogHeader className="border-border border-b px-6 py-4">
            <DialogTitle>Edit prompt</DialogTitle>
            <DialogDescription>
              Update your prompt&apos;s name, description, and prompt content.
            </DialogDescription>
          </DialogHeader>
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
} 