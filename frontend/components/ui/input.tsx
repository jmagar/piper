import * as React from "react"

import { cn } from "@/lib/utils"

const inputStyles = {
  base: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
  file: "file:border-0 file:bg-transparent file:text-sm file:font-medium",
  placeholder: "placeholder:text-muted-foreground",
  focus: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  disabled: "disabled:cursor-not-allowed disabled:opacity-50"
} as const

const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  ({ className, type, ...props }, ref) => {
    const classes = React.useMemo(() => 
      cn(
        inputStyles.base,
        inputStyles.file,
        inputStyles.placeholder,
        inputStyles.focus,
        inputStyles.disabled,
        className
      ),
      [className]
    )

    return (
      <input
        type={type}
        className={classes}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }
