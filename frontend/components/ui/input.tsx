import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Input variants using Tailwind v4 HSL variables
 */
const inputVariants = cva(
  "flex w-full rounded-md bg-transparent file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border border-[hsl(var(--input))] p-2",
        outline: "border border-[hsl(var(--input))] p-2",
        ghost: "border-none p-2",
        underline: "border-b border-[hsl(var(--input))] rounded-none px-2 pb-2 pt-0",
      },
      inputSize: {
        sm: "h-8 text-xs px-3 py-1",
        default: "h-10 text-sm px-4 py-2",
        lg: "h-12 text-base px-5 py-3",
        icon: "h-10 w-10 p-0",
      },
      state: {
        default: "",
        error: "border-[hsl(var(--destructive))] focus-visible:ring-[hsl(var(--destructive))]",
        success: "border-[hsl(var(--success))] focus-visible:ring-[hsl(var(--success))]",
        warning: "border-[hsl(var(--warning))] focus-visible:ring-[hsl(var(--warning))]",
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
      state: "default",
      fullWidth: true,
    },
  }
);

/**
 * Type definition for Input component props
 */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    Omit<VariantProps<typeof inputVariants>, "inputSize"> {
  /**
   * Size variant for the input
   */
  inputSize?: "sm" | "default" | "lg" | "icon";
  /**
   * Leading icon element to show before the input
   */
  leadingIcon?: React.ReactNode;
  /**
   * Trailing icon element to show after the input
   */
  trailingIcon?: React.ReactNode;
  /**
   * Error message to display below the input
   */
  errorMessage?: string;
  /**
   * Help text to display below the input
   */
  helpText?: string;
  /**
   * Container className for the outer div
   */
  containerClassName?: string;
  /**
   * Makes input take full width of its container
   */
  fullWidth?: boolean;
}

/**
 * Enhanced Input component with variants, states, and icon support
 * 
 * @example
 * ```tsx
 * <Input placeholder="Default input" />
 * <Input variant="outline" placeholder="Outline input" />
 * <Input state="error" errorMessage="This field is required" />
 * <Input leadingIcon={<Mail />} placeholder="Email" />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    variant,
    inputSize,
    state,
    fullWidth,
    leadingIcon,
    trailingIcon,
    errorMessage,
    helpText,
    containerClassName,
    type = "text",
    ...props 
  }, ref) => {
    const hasHelpOrError = !!(errorMessage || helpText);
    const showErrorState = state === "error" || !!errorMessage;
    const effectiveState = showErrorState ? "error" : state;
    
    return (
      <div className={cn("space-y-1", containerClassName)}>
        <div className={cn("relative flex items-center", fullWidth ? "w-full" : "")}>
          {leadingIcon && (
            <div className="absolute left-3 flex h-full items-center text-[hsl(var(--muted-foreground))]">
              {leadingIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ 
                variant, 
                inputSize, 
                state: effectiveState, 
                fullWidth, 
                className 
              }),
              leadingIcon && "pl-10",
              trailingIcon && "pr-10"
            )}
            ref={ref}
            aria-invalid={showErrorState}
            aria-describedby={
              hasHelpOrError ? `${props.id}-description` : undefined
            }
            {...props}
          />
          {trailingIcon && (
            <div className="absolute right-3 flex h-full items-center text-[hsl(var(--muted-foreground))]">
              {trailingIcon}
            </div>
          )}
        </div>
        
        {hasHelpOrError && (
          <p
            id={`${props.id}-description`}
            className={cn(
              "text-xs",
              showErrorState
                ? "text-[hsl(var(--destructive))]"
                : "text-[hsl(var(--muted-foreground))]"
            )}
          >
            {errorMessage || helpText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants }; 