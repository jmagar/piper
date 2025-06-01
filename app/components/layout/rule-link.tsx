import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Article } from "@phosphor-icons/react"
import Link from "next/link"

export function RuleLink() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/rules"
          className="text-muted-foreground hover:text-foreground hover:bg-muted bg-background rounded-full p-1.5 transition-colors"
          prefetch
          aria-label="Rules"
        >
          <Article size={24} />
        </Link>
      </TooltipTrigger>
      <TooltipContent>Rules</TooltipContent>
    </Tooltip>
  )
} 