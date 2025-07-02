import type { Message as MessageAISDK } from "@ai-sdk/react"

interface Citation {
  url: string
  title: string
  [key: string]: unknown // Allow other properties
}

interface SummarizationResultItem {
  citations?: Citation[]
}

export function getSources(parts: MessageAISDK["parts"]) {
  const sources = parts
    ?.filter(
      (part) => part.type === "source" || part.type === "tool-invocation"
    )
    .map((part) => {
      if (part.type === "source") {
        return part.source
      }

      if (
        part.type === "tool-invocation" &&
        part.toolInvocation.state === "result"
      ) {
        const result = part.toolInvocation.result

        if (
          part.toolInvocation.toolName === "summarizeSources" &&
          result?.result?.[0]?.citations
        ) {
          return result.result.flatMap(
            (item: SummarizationResultItem) => item.citations || []
          )
        }

        return Array.isArray(result) ? result.flat() : result
      }

      return null
    })
    .filter(Boolean)
    .flat()

  const validSources =
    sources?.filter(
      (source) =>
        source && typeof source === "object" && source.url && source.url !== ""
    ) || []

  return validSources
}
