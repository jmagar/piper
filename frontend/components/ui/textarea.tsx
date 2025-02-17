import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-background ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 flex min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[colors,box-shadow] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:outline-1 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export default Textarea 