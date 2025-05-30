"use client"

import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogTrigger,
} from "@/components/motion-primitives/morphing-dialog"
import {
  MessageAction,
  MessageActions,
  Message as MessageContainer,
  MessageContent,
} from "@/components/prompt-kit/message"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { UIMessage as MessageType } from "@ai-sdk/react"
import { Check, Copy, Trash } from "@phosphor-icons/react"
import { useRef, useState } from "react"

export type MessageUserProps = {
  hasScrollAnchor?: boolean
  // attachments?: MessageType["experimental_attachments"] // Removed: attachments are in 'parts'
  parts?: MessageType['parts']
  children?: string // Fallback or for simpler text-only scenarios if parts aren't processed by parent
  copied: boolean
  copyToClipboardAction: () => void
  onEditAction: (id: string, newText: string) => void
  onReloadAction: () => void
  onDeleteAction: (id: string) => void
  id: string
}

export function MessageUser({
  hasScrollAnchor,
  // attachments, // Removed
  parts,
  children,
  copied,
  copyToClipboardAction,
  onEditAction,
  onReloadAction,
  onDeleteAction,
  id,
}: MessageUserProps) {
  let extractedTextContent = '';

  // Filter for text parts and extract content
  if (parts && parts.length > 0) {
    const textPart = parts.find((part): part is Extract<MessageType['parts'][number], { type: 'text' }> => part.type === 'text');
    if (textPart) {
      extractedTextContent = textPart.text;
    }
  } else if (children) {
    // Fallback to children if parts are not available or don't contain text
    extractedTextContent = children;
  }

  // Filter for image parts using a type predicate for strong typing
  const imageParts = parts?.filter(
    (part): part is Extract<MessageType['parts'][number], { type: 'file'; mediaType: string }> => {
      if (part.type === 'file' && 'mediaType' in part && typeof part.mediaType === 'string') {
        return part.mediaType.startsWith('image/');
      }
      return false;
    }
  ) || [];

  // Fallback to children if parts are not available or don't contain text (already handled for extractedTextContent)
  if (!extractedTextContent && children) {
    // Fallback to children if parts are not available or don't contain text
    extractedTextContent = children;
  }

  const [editInput, setEditInput] = useState(extractedTextContent)
  const [isEditing, setIsEditing] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditInput(extractedTextContent)
  }

  const handleSave = () => {
    if (onEditAction) {
      onEditAction(id, editInput)
    }
    onReloadAction()
    setIsEditing(false)
  }

  const handleDelete = () => {
    onDeleteAction(id)
  }

  return (
    <MessageContainer
      className={cn(
        "group flex w-full max-w-3xl flex-col items-end gap-0.5 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor"
      )}
    >
      {imageParts.map((imagePart, index) => { // Renamed to imagePart for clarity, already correctly typed
        // No need for 'if (imagePart.type !== 'image')' due to Array<Extract<...>> typing
        const imageUrl = typeof imagePart.url === 'string' ? imagePart.url : '';
        const imageName = imagePart.filename || `image-${index}`; // Or derive from imagePart if available

        return (
          <div
            className="flex flex-row gap-2"
            key={`${imageName}-${index}`}
          >
            {imagePart.mediaType?.startsWith("image") && imageUrl ? (

            <MorphingDialog
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 18,
                mass: 0.3,
              }}
            >
              <MorphingDialogTrigger className="z-10">
                <img
                  className="mb-1 w-40 rounded-md"
                  key={imageName}
                  src={imageUrl}
                  alt={imageName}
                />
              </MorphingDialogTrigger>
              <MorphingDialogContainer>
                <MorphingDialogContent className="relative rounded-lg">
                  <MorphingDialogImage
                    src={imageUrl}
                    alt={imageName || ""}
                    className="max-h-[90vh] max-w-[90vw] object-contain"
                  />
                </MorphingDialogContent>
                <MorphingDialogClose className="text-primary" />
              </MorphingDialogContainer>
            </MorphingDialog>
          ) : null} {/* Add rendering for other attachment types from parts here if needed */}
        </div>
      )}
    )}
      {isEditing ? (
        <div
          className="bg-accent relative flex min-w-[180px] flex-col gap-2 rounded-3xl px-5 py-2.5"
          style={{
            width: contentRef.current?.offsetWidth,
          }}
        >
          <textarea
            className="w-full resize-none bg-transparent outline-none"
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSave()
              }
              if (e.key === "Escape") {
                handleEditCancel()
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <MessageContent
          className="bg-accent relative max-w-[70%] rounded-3xl px-5 py-2.5"
          markdown={true}
          ref={contentRef}
          components={{
            code: ({ children }) => <>{children}</>,
            pre: ({ children }) => <>{children}</>,
            h1: ({ children }) => <p>{children}</p>,
            h2: ({ children }) => <p>{children}</p>,
            h3: ({ children }) => <p>{children}</p>,
            h4: ({ children }) => <p>{children}</p>,
            h5: ({ children }) => <p>{children}</p>,
            h6: ({ children }) => <p>{children}</p>,
            p: ({ children }) => <p>{children}</p>,
            li: ({ children }) => <p>- {children}</p>,
            ul: ({ children }) => <>{children}</>,
            ol: ({ children }) => <>{children}</>,
          }}
        >
          {extractedTextContent}
        </MessageContent>
      )}
      <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-0 group-hover:opacity-100">
        <MessageAction tooltip={copied ? "Copied!" : "Copy text"} side="bottom">
          <button
            className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Copy text"
            onClick={copyToClipboardAction}
            type="button"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </MessageAction>
        {/* @todo: add when ready */}
        {/* <MessageAction
          tooltip={isEditing ? "Save" : "Edit"}
          side="bottom"
          delayDuration={0}
        >
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Edit"
            onClick={() => setIsEditing(!isEditing)}
            type="button"
          >
            <PencilSimple className="size-4" />
          </button>
        </MessageAction> */}
        <MessageAction tooltip="Delete" side="bottom">
          <button
            className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Delete"
            onClick={handleDelete}
            type="button"
          >
            <Trash className="size-4" />
          </button>
        </MessageAction>
      </MessageActions>
    </MessageContainer>
  )
}
