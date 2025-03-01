import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card component with header, content, and footer subcomponents
 * Follows Tailwind v4 color system with HSL variables
 */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Makes card take full width of its container
   */
  fullWidth?: boolean;
  /**
   * Applies additional padding to the card
   */
  padded?: boolean;
  /**
   * Applies surface styling
   */
  variant?: 'default' | 'raised' | 'overlay' | 'sunken';
}

/**
 * Card component that provides a container with border, rounded corners, and background
 * Can be used with Card.Header, Card.Title, Card.Description, Card.Content, and Card.Footer
 * 
 * @example
 * ```tsx
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Card Title</Card.Title>
 *     <Card.Description>Card description</Card.Description>
 *   </Card.Header>
 *   <Card.Content>
 *     Your content here
 *   </Card.Content>
 *   <Card.Footer>
 *     <Button>Action</Button>
 *   </Card.Footer>
 * </Card>
 * ```
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, fullWidth, padded = true, variant = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-[hsl(var(--card))]",
      raised: "bg-[hsl(var(--surface-raised))]",
      overlay: "bg-[hsl(var(--surface-overlay))]",
      sunken: "bg-[hsl(var(--surface-sunken))]",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--card-foreground))] shadow-sm",
          fullWidth ? "w-full" : "",
          padded ? "p-6" : "",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

/**
 * Card header component
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "Card.Header";

/**
 * Card title component
 */
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "Card.Title";

/**
 * Card description component
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[hsl(var(--muted-foreground))]", className)}
    {...props}
  />
));
CardDescription.displayName = "Card.Description";

/**
 * Card content component
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "Card.Content";

/**
 * Card footer component
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between pt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "Card.Footer";

// Define the composite card type with all subcomponents
export type CompositeCard = typeof Card & {
  Header: typeof CardHeader;
  Title: typeof CardTitle;
  Description: typeof CardDescription;
  Content: typeof CardContent;
  Footer: typeof CardFooter;
};

// Attach subcomponents to the Card component
(Card as CompositeCard).Header = CardHeader;
(Card as CompositeCard).Title = CardTitle;
(Card as CompositeCard).Description = CardDescription;
(Card as CompositeCard).Content = CardContent;
(Card as CompositeCard).Footer = CardFooter;

export { Card }; 