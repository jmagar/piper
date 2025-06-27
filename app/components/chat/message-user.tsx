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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Message as MessageType } from "@ai-sdk/react"
import { Check, Copy, Trash, User } from "@phosphor-icons/react"
import { useRef, useState } from "react"

const getTextFromDataUrl = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1]
  return base64
}

export type MessageUserProps = {
  hasScrollAnchor?: boolean
  attachments?: MessageType["experimental_attachments"]
  children: string
  copied: boolean
  copyToClipboard: () => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  onDelete: (id: string) => void
  id: string
  timestamp?: Date
}

export function MessageUser({
  hasScrollAnchor,
  attachments,
  children,
  copied,
  copyToClipboard,
  onEdit,
  onReload,
  onDelete,
  id,
  timestamp,
}: MessageUserProps) {
  const [editInput, setEditInput] = useState(children)
  const [isEditing, setIsEditing] = useState(false)
  const [showTimestamp, setShowTimestamp] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditInput(children)
  }

  const handleSave = () => {
    if (onEdit) {
      onEdit(id, editInput)
    }
    onReload()
    setIsEditing(false)
  }

  const handleDelete = () => {
    onDelete(id)
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date)
  }

  return (
    <MessageContainer
      className={cn(
        "group flex w-full max-w-3xl flex-row-reverse items-start gap-4 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor"
      )}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      <Avatar className="size-8 shrink-0 mt-1">
        <AvatarImage src="/user-avatar.svg" alt="User" />
        <AvatarFallback className="bg-blue-600 text-white">
          <User className="size-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col items-end gap-0.5 relative">
        {showTimestamp && timestamp && (
          <div className="absolute -top-6 right-0 z-10 text-xs text-muted-foreground">
            {formatTimestamp(timestamp)}
          </div>
        )}

        {attachments?.map((attachment, index) => (
          <div
            className="flex flex-row gap-2"
            key={`${attachment.name}-${index}`}
          >
            {attachment.contentType?.startsWith("image") ? (
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
                    key={attachment.name}
                    src={attachment.url}
                    alt={attachment.name}
                  />
                </MorphingDialogTrigger>
                <MorphingDialogContainer>
                  <MorphingDialogContent className="relative rounded-lg">
                    <MorphingDialogImage
                      src={attachment.url}
                      alt={attachment.name || ""}
                      className="max-h-[90vh] max-w-[90vw] object-contain"
                    />
                  </MorphingDialogContent>
                  <MorphingDialogClose className="text-primary" />
                </MorphingDialogContainer>
              </MorphingDialog>
            ) : attachment.contentType?.startsWith("text") ? (
              <div className="text-primary mb-3 h-24 w-40 overflow-hidden rounded-md border p-2 text-xs">
                {getTextFromDataUrl(attachment.url)}
              </div>
            ) : null}
          </div>
        ))}
        {isEditing ? (
          <div
            className="bg-blue-600 text-white relative flex min-w-[180px] flex-col gap-2 rounded-2xl px-4 py-3 border border-blue-500"
            style={{
              width: contentRef.current?.offsetWidth,
            }}
          >
            <textarea
              className="w-full resize-none bg-transparent outline-none placeholder-blue-200"
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
              <Button size="sm" variant="ghost" onClick={handleEditCancel} className="text-white hover:bg-blue-500">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="bg-white text-blue-600 hover:bg-blue-50">
                Save
              </Button>
            </div>
          </div>
        ) : (
          <MessageContent
            className={cn(
              "relative max-w-[85%] rounded-2xl border bg-blue-500 p-4 text-white shadow-md",
              "border-blue-600"
            )}
            markdown={true}
            ref={contentRef}
            components={{
              code: ({ children }) => <span className="bg-blue-600 px-1 rounded text-blue-100">{children}</span>,
              pre: ({ children }) => <div className="bg-blue-600 p-2 rounded text-blue-100 my-2">{children}</div>,
              h1: ({ children }) => <p className="font-bold text-white">{children}</p>,
              h2: ({ children }) => <p className="font-semibold text-white">{children}</p>,
              h3: ({ children }) => <p className="font-medium text-white">{children}</p>,
              h4: ({ children }) => <p className="font-medium text-white">{children}</p>,
              h5: ({ children }) => <p className="font-medium text-white">{children}</p>,
              h6: ({ children }) => <p className="font-medium text-white">{children}</p>,
              a: ({ href, children, ...props }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-100 hover:text-white hover:underline"
                  {...props}
                >
                  {children}
                </a>
              ),
              p: ({ children }) => {
                if (typeof children !== 'string') {
                  return <p className="text-white">{children}</p>;
                }
                const parts = children.split(/(@files\/[^\s]+)/g);
                return (
                  <p className="text-white">
                    {parts.map((part, index) => {
                      if (part.startsWith('@files/')) {
                        const filePath = part.substring(7); // Remove '@files/'
                        return (
                          <a 
                            key={index} 
                            href={`/uploads/${filePath}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-100 hover:text-white hover:underline"
                          >
                            {part}
                          </a>
                        );
                      }
                      return part;
                    })}
                  </p>
                );
              },
              li: ({ children }) => <p className="text-white">- {children}</p>,
              ul: ({ children }) => <div className="text-white">{children}</div>,
              ol: ({ children }) => <div className="text-white">{children}</div>,
            }}
          >
            {children}
          </MessageContent>
        )}
        <MessageActions className="flex gap-0 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100">
          <MessageAction tooltip={copied ? "Copied!" : "Copy text"} side="bottom">
            <button
              className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
              aria-label="Copy text"
              onClick={copyToClipboard}
              type="button"
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </MessageAction>
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
      </div>
    </MessageContainer>
  )
}
