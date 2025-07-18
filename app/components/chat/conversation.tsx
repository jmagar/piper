"use client"

import { ScrollButton } from "@/components/motion-primitives/scroll-button"
import { Loader } from "@/components/prompt-kit/loader"
import { Message } from "./message"
import { type Message as MessageType } from "ai"
import { useRef } from "react"
import { ChatContainer } from "@/components/prompt-kit/chat-container"

type ConversationProps = {
  messages: MessageType[]
  status: "streaming" | "ready" | "submitted" | "error"
}

export function Conversation({
  messages,
  status,
}: ConversationProps) {
  const initialMessageCount = useRef(messages.length)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto">
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 mx-auto flex w-full flex-col justify-center">
        <div className="h-app-header bg-background flex w-full lg:hidden lg:h-0" />
        <div className="h-app-header bg-background flex w-full mask-b-from-4% mask-b-to-100% lg:hidden" />
      </div>
      <ChatContainer
        className="relative flex w-full flex-col items-center pt-20 pb-4"
        autoScroll={true}
        ref={containerRef}
        scrollToRef={scrollRef}
        style={{
          scrollbarGutter: "stable both-edges",
        }}
      >
        {messages?.map((message, index) => {
          const isLast = index === messages.length - 1 && status !== "submitted"
          const hasScrollAnchor =
            isLast && messages.length > initialMessageCount.current

          return (
            <Message
              key={message.id}
              id={message.id}
              variant={message.role}
              attachments={message.experimental_attachments}
              isLast={isLast}
              hasScrollAnchor={hasScrollAnchor}
              parts={message.parts}
              status={status}
              createdAt={message.createdAt}
            >
              {message.content}
            </Message>
          )
        })}
        {status === "submitted" &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <div className="group min-h-scroll-anchor flex w-full max-w-3xl flex-col items-start gap-2 px-6 pb-2">
              <Loader />
            </div>
          )}
      </ChatContainer>
      <div className="absolute bottom-0 w-full max-w-3xl">
        <ScrollButton
          className="absolute top-[-50px] right-[30px]"
          scrollRef={scrollRef}
          containerRef={containerRef}
        />
      </div>
    </div>
  )
}
