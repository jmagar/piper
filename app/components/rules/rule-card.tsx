import { cn } from "@/lib/utils"
import { Article } from "@phosphor-icons/react"

type RuleCardProps = {
  id: string
  name: string
  description: string
  system_prompt: string
  slug: string
  className?: string
  isAvailable?: boolean
  onClick?: () => void
  isLight?: boolean
}

export function RuleCard({
  name,
  description,
  system_prompt,
  className,
  isAvailable = true,
  onClick,
  isLight = false,
}: RuleCardProps) {
  return (
    <button
      className={cn(
        "flex items-start justify-start",
        "bg-secondary hover:bg-accent cursor-pointer rounded-xl p-4 transition-colors",
        className,
        !isAvailable && "cursor-not-allowed opacity-50"
      )}
      type="button"
      onClick={(e) => {
        e.preventDefault()

        if (!isAvailable) return

        onClick?.()
      }}
    >
      <div className="flex flex-col items-start space-y-2">
        <div className="flex items-center space-x-2">
          <div className="bg-muted flex size-4 items-center justify-center rounded">
            <Article className="size-3 text-muted-foreground" />
          </div>
          <h3 className="text-foreground text-base font-medium">{name}</h3>
        </div>

        <p className="text-foreground line-clamp-2 text-left text-sm">
          {description}
        </p>

        {!isLight && system_prompt && (
          <p className="text-muted-foreground line-clamp-2 text-left font-mono text-sm">
            {system_prompt}
          </p>
        )}

        {!isLight && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-muted-foreground">
              prompt snippet
            </span>
          </div>
        )}
      </div>
    </button>
  )
} 