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
import { useState } from "react"
import { useBreakpoint } from "../../../hooks/use-breakpoint"
import { CreateRuleForm } from "./create-rule-form"

type RuleFormData = {
  name: string
  description: string
  systemPrompt: string
}

type DialogCreateRuleTriggerProps = {
  trigger: React.ReactNode
}

export function DialogCreateRuleTrigger({
  trigger,
}: DialogCreateRuleTriggerProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<RuleFormData>({
    name: "",
    description: "",
    systemPrompt: "",
  })
  const [error, setError] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const isMobile = useBreakpoint(768)

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
      newErrors.name = "Rule name is required"
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
      const apiResponse = await fetchClient("/api/create-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          systemPrompt: formData.systemPrompt.trim(),
        }),
      })

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json()
        throw new Error(errorData.error || "Failed to create rule")
      }

      const result = await apiResponse.json()
      toast({ title: "Rule created successfully!", status: "success" })
      setOpen(false)
      
      // Reset form data
      setFormData({
        name: "",
        description: "",
        systemPrompt: "",
      })
      setError({})
      
      // Navigate to the new rule
      router.push(`/rules/${result.rule.slug}`)
    } catch (err: unknown) {
      let errorMessage = "An unexpected error occurred."
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      toast({ title: "Error creating rule", description: errorMessage, status: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const content = (
    <CreateRuleForm
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
            <VaulDrawerTitle>Create rule</VaulDrawerTitle>
            <VaulDrawerDescription>
              Rules are reusable prompt snippets that can be @mentioned in conversations.
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
            <DialogTitle>Create rule</DialogTitle>
            <DialogDescription>
              Rules are reusable prompt snippets that can be @mentioned in conversations.
            </DialogDescription>
          </DialogHeader>
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
} 