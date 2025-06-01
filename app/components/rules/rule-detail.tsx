"use client"

import { ButtonCopy } from "@/components/common/button-copy"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { fetchClient } from "@/lib/fetch"
import { cn } from "@/lib/utils"
import {
  Article,
  Check,
  CopySimple,
  DotsThree,
  PencilSimple,
  Trash,
  X,
} from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { DialogEditRuleTrigger } from "./dialog-edit-rule/dialog-trigger-edit-rule"

function SystemPromptDisplay({ prompt }: { prompt: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = prompt.length > 300

  const displayText =
    isLong && !expanded ? prompt.slice(0, 300) + "..." : prompt

  return (
    <div className="group relative rounded-md border p-2">
      <div className="absolute top-0 right-0 flex h-9 items-center bg-white pr-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <ButtonCopy code={prompt} />
      </div>
      <div className="text-muted-foreground max-h-[expanded ? '400px' : '150px'] overflow-auto text-left font-mono text-sm whitespace-pre-wrap">
        {displayText}
      </div>
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 h-6 text-xs"
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
    </div>
  )
}

type RuleDetailProps = {
  id: string
  slug: string
  name: string
  description: string
  system_prompt: string
  createdAt?: Date | string
  updatedAt?: Date | string
  onRuleClickAction?: (ruleId: string) => void
  moreRules?: Array<{
    id: string
    name: string
    description: string
    slug: string
  }>
  isFullPage?: boolean
}

export function RuleDetail({
  id,
  slug,
  name,
  description,
  system_prompt,
  createdAt,
  updatedAt,
  onRuleClickAction,
  moreRules = [],
  isFullPage,
}: RuleDetailProps) {
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${window.location.origin}/rules/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  useEffect(() => {
    if (moreRules.length > 0 && isFullPage) {
      moreRules.forEach((rule) => {
        router.prefetch(`/rules/${rule.slug}`)
      })
    }
  }, [moreRules, router, isFullPage])

  const handleRuleClick = (rule: { id: string; slug: string }) => {
    if (onRuleClickAction) {
      onRuleClickAction(rule.id)
    } else {
      router.push(`/rules/${rule.slug}`)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetchClient(`/api/delete-rule/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Rule deleted successfully.",
        status: "success",
      })

      setShowDeleteDialog(false)

      // If we're in a dialog (not full page), close it first
      if (!isFullPage && onRuleClickAction) {
        onRuleClickAction("")
      }

      // Navigate to rules page
      router.push("/rules")
    } catch (error) {
      console.error("Failed to delete rule:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete rule. Please try again.",
        status: "error",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const canDelete = true

  return (
    <div
      className={cn(
        "bg-background relative flex w-full flex-col",
        !isFullPage ? "h-full max-h-[80vh]" : "h-full"
      )}
    >
      <div
        className={cn(
          "flex-1 overflow-x-hidden overflow-y-auto",
          isFullPage ? "pb-0" : "pb-20"
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-4 pt-8 pr-8 pl-8">
          <div className="flex items-center gap-4">
            <div className="bg-background flex size-16 items-center justify-center rounded-full border border-dashed">
              <Article className="size-8" />
            </div>
            <h1 className="text-2xl font-medium">{name}</h1>
          </div>

          <div
            className={cn(
              isFullPage ? "relative" : "absolute top-0 right-0 p-4"
            )}
          >
            {isFullPage && canDelete && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    type="button"
                  >
                    <DotsThree className="size-4" weight="bold" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DialogEditRuleTrigger
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <PencilSimple className="size-4" />
                        Edit rule
                      </DropdownMenuItem>
                    }
                    ruleData={{
                      id,
                      slug,
                      name,
                      description,
                      system_prompt,
                    }}
                    onRuleUpdatedAction={() => {
                      router.refresh()
                    }}
                  />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash className="fill-destructive size-4" />
                    Delete rule
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!isFullPage && (
              <div className="flex items-center gap-2">
                {canDelete && (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        type="button"
                      >
                        <DotsThree className="size-4" weight="bold" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DialogEditRuleTrigger
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <PencilSimple className="size-4" />
                            Edit rule
                          </DropdownMenuItem>
                        }
                        ruleData={{
                          id,
                          slug,
                          name,
                          description,
                          system_prompt,
                        }}
                        onRuleUpdatedAction={() => {
                          router.refresh()
                        }}
                      />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash className="fill-destructive size-4" />
                        Delete rule
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  type="button"
                  onClick={() => onRuleClickAction?.("")}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 md:px-8">
          <p className="text-muted-foreground mb-6">{description}</p>
        </div>

        <div className="mt-4 mb-8 px-4 md:px-8">
          <h2 className="mb-4 text-lg font-medium">System Prompt</h2>
          <SystemPromptDisplay prompt={system_prompt} />
        </div>

        {(createdAt || updatedAt) && (
          <div className="mb-8 grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:px-8">
            {createdAt && (
              <div className="rounded-md border p-2">
                <h3 className="mb-2 text-xs font-medium">Created</h3>
                <p className="text-muted-foreground text-xs">
                  {new Date(createdAt).toLocaleString()}
                </p>
              </div>
            )}
            {updatedAt && (
              <div className="rounded-md border p-2">
                <h3 className="mb-2 text-xs font-medium">Updated</h3>
                <p className="text-muted-foreground text-xs">
                  {new Date(updatedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}

        {moreRules && moreRules.length > 0 && (
          <div className="mt-8 pb-8">
            <h2 className="mb-4 pl-4 text-lg font-medium md:pl-8">
              More rules
            </h2>
            <div
              className={cn(
                isFullPage
                  ? "grid grid-cols-1 gap-4 px-4 md:grid-cols-2 md:px-8"
                  : "flex snap-x snap-mandatory scroll-ps-6 flex-nowrap gap-4 overflow-x-auto pl-4 md:pl-8"
              )}
              style={{
                scrollbarWidth: "none",
              }}
            >
              {moreRules.map((rule, index) => (
                <div
                  key={rule.id}
                  onClick={() => handleRuleClick(rule)}
                  className={cn(
                    "bg-secondary hover:bg-accent h-full cursor-pointer rounded-xl p-4 transition-colors",
                    isFullPage ? "w-full" : "min-w-[280px]",
                    index === moreRules.length - 1 && "mr-6"
                  )}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="bg-muted size-12 overflow-hidden rounded-full flex items-center justify-center">
                        <Article className="size-6" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-foreground truncate text-base font-medium">
                        {rule.name}
                      </h3>
                      <p className="text-foreground mt-1 line-clamp-2 text-xs">
                        {rule.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          "bg-background right-0 bottom-0 left-0 z-10 flex flex-row gap-2 border-t px-4 py-4 md:px-8",
          !isFullPage ? "fixed" : "relative"
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={copyToClipboard}
              className="flex-1 text-center"
              type="button"
              variant="outline"
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <CopySimple className="size-4" />
              )}
              Share this rule
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {copied ? "Copied to clipboard" : "Copy link to clipboard"}
          </TooltipContent>
        </Tooltip>
        <Button className="flex-1 text-center" type="button">
          <Article className="size-4" />
          Use @{slug}
        </Button>
      </div>

      {/* Show AlertDialog in both full page and modal modes */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the rule
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 