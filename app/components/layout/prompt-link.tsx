import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Article } from "@phosphor-icons/react"
import Link from "next/link"

export function PromptLink() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/prompts"
          className="text-muted-foreground hover:text-foreground hover:bg-muted bg-background rounded-full p-1.5 transition-colors"
          prefetch
          aria-label="Prompts"
        >
          <Article size={24} />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Prompts</TooltipContent>
    </Tooltip>
  )
} 