import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * Button variants using Tailwind v4 HSL variables
 * This uses direct HSL values with the updated Tailwind v4 color system
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-[hsl(var(--background))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-emphasis))]",
        destructive: "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]/90",
        success: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90",
        outline: "border border-[hsl(var(--border))] bg-transparent hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
        secondary: "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]/80",
        ghost: "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
        link: "text-[hsl(var(--primary))] underline-offset-4 hover:underline",
        muted: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-7 rounded-md px-2 text-xs",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-xs": "h-6 w-6",
      },
      isLoading: {
        true: "relative text-transparent transition-none hover:text-transparent",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      isLoading: false,
      fullWidth: false,
    },
  }
);

/**
 * Type definition for Button component props
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Optional prop to render the button as a different element
   */
  asChild?: boolean;
  /**
   * Should the button show a loading indicator
   */
  isLoading?: boolean;
  /**
   * Should the button take the full width of its container
   */
  fullWidth?: boolean;
  /**
   * Optional leading icon component
   */
  leadingIcon?: React.ReactNode;
  /**
   * Optional trailing icon component
   */
  trailingIcon?: React.ReactNode;
}

/**
 * Button component with multiple variants, sizes, and states
 * Supports loading state, full width, and optional icons
 * 
 * @example
 * ```tsx
 * <Button>Default Button</Button>
 * <Button variant="secondary" size="lg">Large Secondary Button</Button>
 * <Button variant="destructive" isLoading>Loading Destructive Button</Button>
 * <Button variant="outline" leadingIcon={<IconName />}>Button with Icon</Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false,
    isLoading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    children,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    // When asChild is true, we need to ensure we're only passing a single child to Slot
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, isLoading, fullWidth, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }
    
    // For regular button, we can include the loading indicator and content wrapper
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, isLoading, fullWidth, className }))}
        ref={ref}
        {...props}
      >
        {isLoading && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <svg
              className="animate-spin-reverse h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}
        
        <span className="flex items-center gap-2">
          {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
          {children}
          {trailingIcon && <span className="shrink-0">{trailingIcon}</span>}
        </span>
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants }; 