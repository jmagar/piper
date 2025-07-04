"use client"

// import { useUser } from "@/app/providers/user-provider" // Not needed for updateUser
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState, useCallback } from "react"

const LOCAL_STORAGE_KEY = "adminGlobalSystemPrompt"

export function SystemPromptSection() {
  // const { user, updateUser } = useUser() // updateUser removed
  const [prompt, setPrompt] = useState("")
  const [initialPrompt, setInitialPrompt] = useState("") // To track changes
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Load prompt from localStorage on mount
    const savedPrompt = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (savedPrompt !== null) {
      setPrompt(savedPrompt)
      setInitialPrompt(savedPrompt)
    }
  }, [])

  const savePromptToLocalStorage = useCallback(async () => {
    setIsLoading(true)
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, prompt)
      setInitialPrompt(prompt) // Update initialPrompt to current saved value
      toast({
        title: "Default prompt saved",
        description: "It'll be used for new chats (if implemented in chat creation).",
        status: "success",
      })
    } catch (error) {
      console.error("Error saving system prompt to localStorage:", error)
      toast({
        title: "Failed to save",
        description: "Couldn't save your system prompt. Please try again.",
        status: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [prompt])

  const clearPromptFromLocalStorage = useCallback(async () => {
    setIsLoading(true)
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
      setPrompt("")
      setInitialPrompt("")
      toast({
        title: "Default prompt cleared",
        status: "info",
      })
    } catch (error) {
      console.error("Error clearing system prompt from localStorage:", error)
      toast({
        title: "Failed to clear",
        status: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])


  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setPrompt(value)
  }

  const hasChanges = prompt !== initialPrompt

  return (
    <div>
      <Label htmlFor="system-prompt" className="mb-3 text-sm font-medium">
        Default system prompt (Admin)
      </Label>
      <div className="relative">
        <Textarea
          id="system-prompt"
          className="min-h-24 w-full"
          placeholder="Enter a default system prompt for new conversations (saved in your browser)"
          value={prompt}
          onChange={handlePromptChange}
        />

        <AnimatePresence>
          {(hasChanges || (prompt && !initialPrompt)) && ( // Show save if changed or if there's a prompt and nothing was initially set
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-3 bottom-3 flex gap-2"
            >
              <Button
                size="sm"
                onClick={savePromptToLocalStorage}
                className="shadow-sm"
                disabled={isLoading || !hasChanges}
              >
                {isLoading ? "Saving..." : "Save to Browser"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {initialPrompt && ( // Show clear button only if there is a saved prompt
          <Button 
            variant="link" 
            size="sm" 
            onClick={clearPromptFromLocalStorage} 
            disabled={isLoading}
            className="px-0 mt-1 text-xs text-muted-foreground hover:text-destructive"
          >
            Clear saved prompt
          </Button>
      )}
      <p className="text-muted-foreground mt-2 text-xs">
        This prompt is saved in your browser and can be used for new chats.
      </p>
    </div>
  )
}
