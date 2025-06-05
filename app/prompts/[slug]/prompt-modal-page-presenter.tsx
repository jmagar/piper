"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DialogPrompt } from "@/app/components/prompts/dialog-prompt"
import type { Prompt as PromptType, PromptSummary } from "@/app/types/prompt"


interface PromptModalPagePresenterProps {
  prompt: PromptType;
  morePrompts: PromptSummary[];
}

export function PromptModalPagePresenter({ prompt, morePrompts }: PromptModalPagePresenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  // Open the dialog automatically when the component mounts with prompt data
  useEffect(() => {
    if (prompt) {
      setIsOpen(true)
    }
  }, [prompt])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // When dialog closes, navigate to the main prompts listing page
      // or another appropriate fallback.
      router.push("/prompts") // Assuming '/prompts' is the list page
    }
  }

  if (!prompt) {
    // This case should ideally be handled by the parent server component (e.g., notFound())
    // but as a fallback, render nothing or a loading/error state.
    return null;
  }

  return (
    <>
      {/* Render a minimal background or placeholder for the page if needed */}
      {/* For now, it's just a fragment, assuming DialogPrompt handles overlay */}
      <DialogPrompt
        {...prompt} // Spread all prompt properties
        isOpen={isOpen}
        onOpenChangeAction={handleOpenChange}
        morePrompts={morePrompts}
        // No explicit trigger is passed; DialogPrompt will use its default (PromptCard)
        // or we could design it to not render a trigger if isOpen is managed externally like this.
        // For now, let's assume it's okay if a default trigger is technically present but not used to open.
      />
    </>
  )
}
