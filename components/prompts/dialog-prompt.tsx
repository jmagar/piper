"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import type { Prompt as PromptType, PromptSummary } from "@/app/types/prompt"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { PromptDetail } from "./prompt-detail" // Reusing PromptDetail
import { PromptCard } from "./prompt-card" // Assuming a PromptCard component will be created as a default trigger

// Props for DialogPrompt, directly using PromptType and adding specific dialog controls
interface DialogPromptProps extends PromptType {
  className?: string;
  isOpen: boolean;
  onOpenChangeAction: (open: boolean) => void;
  morePrompts?: PromptSummary[];
  trigger?: React.ReactNode;
}

export function DialogPrompt({
  id,
  name,
  description,
  slug,
  system_prompt,
  createdAt,
  updatedAt,
  className,
  isOpen,
  onOpenChangeAction,
  morePrompts = [],
  trigger = null,
}: DialogPromptProps) {
  const isMobile = useBreakpoint(768)

  const handleOpenChange = (open: boolean) => {
    // Update URL when opening, clear when closing if needed, or rely on router state
    if (open) {
      window.history.replaceState(null, "", `/prompts/${slug}`)
    } else {
      // Optionally, revert URL to a base prompts page or rely on parent component to manage URL
      // For now, let's assume the parent or router handles URL reversion on close if necessary
    }
    onOpenChangeAction(open)
  }

  // Default trigger will be a PromptCard, to be created later
  const defaultTrigger = (
    <PromptCard
      id={id}
      name={name}
      description={description}
      slug={slug}
      system_prompt={system_prompt} // Restored: PromptCardProps includes system_prompt
      className={className}
      onClick={() => handleOpenChange(true)}
      // Add any other relevant props for PromptCard
    />
  )

  const renderContent = () => (
    <PromptDetail
      id={id}
      slug={slug}
      name={name}
      description={description}
      system_prompt={system_prompt}
      createdAt={createdAt}
      updatedAt={updatedAt}
      morePrompts={morePrompts}
      isFullPage={false} // Key change: render PromptDetail in its modal/compact form
      // onPromptClickAction can be passed if needed for interactions within the modal
    />
  )

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{trigger || defaultTrigger}</DrawerTrigger>
        <DrawerContent className="bg-background border-border">
          {/* Adjust height/padding for drawer as needed */}
          <div className="h-[90vh] overflow-y-auto p-4">
            {renderContent()}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent
        // Removed hasCloseButton={false} - it's not a standard shadcn/ui prop for DialogContent;
        // default close button will now render and use the onOpenChange from Dialog.
        className="[&>button:last-child]:bg-background flex max-h-[90vh] w-[90vw] max-w-6xl flex-col gap-0 overflow-hidden rounded-lg p-0 shadow-lg [&>button:last-child]:rounded-full [&>button:last-child]:p-1 md:rounded-3xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
