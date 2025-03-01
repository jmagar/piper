# TailwindCSS 4 Configuration Guide

## Overview

This guide outlines the implementation and configuration of TailwindCSS 4 for our frontend refactoring project. TailwindCSS 4 introduces several major improvements including a smaller bundle size, simplified color system, logical properties, and enhanced performance, which we'll leverage to build a more responsive and maintainable UI.

## Key Changes in TailwindCSS 4

- **Simplified Color System**: New color palette with fewer default shades
- **Logical Properties**: Support for directional-agnostic styling
- **Container Queries**: Component-level responsive design
- **Dynamic Viewport Units**: Better support for mobile browsers
- **Arbitrary Property Syntax**: More flexible custom styling
- **Performance Improvements**: Faster build times and smaller runtime
- **Lightning CSS**: Replaces PostCSS for better performance
- **Improved CSS Variables**: Enhanced theming capabilities
- **Custom Reset Styles**: More control over base styling

## Setup and Configuration

### 1. Base Installation

```bash
# Install TailwindCSS 4 and its dependencies
pnpm add tailwindcss@4.0.0 @tailwindcss/typography @tailwindcss/forms
```

### 2. Configuration File

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

export default {
  darkMode: 'class',
  
  // Content paths for Tailwind to scan
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './components-v2/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  
  theme: {
    // Container configuration
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    
    // Extended theme configuration
    extend: {
      // Color definitions
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        
        // Primary color and variants
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          muted: 'hsl(var(--primary-muted))',
          emphasis: 'hsl(var(--primary-emphasis))',
        },
        
        // Secondary color and variants  
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        
        // Semantic colors with light/dark mode variants
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        
        // UI component colors
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      
      // Border radius definitions
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      
      // Font definitions
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        mono: ['var(--font-mono)', ...fontFamily.mono],
      },
      
      // Key transitions
      transitionDuration: {
        '250': '250ms',
        '400': '400ms',
      },
      
      // Animation definitions
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  
  // Plugins configuration
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
} satisfies Config
```

### 3. CSS Variables Configuration

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --primary-muted: 217 90% 95%;
    --primary-emphasis: 221.2 90% 40%;
    
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    
    --success: 142 76% 36%;
    --success-foreground: 210 40% 98%;
    
    --warning: 38 92% 50%;
    --warning-foreground: 210 40% 98%;
    
    --info: 217 91% 60%;
    --info-foreground: 210 40% 98%;
    
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    
    --radius: 0.5rem;
    
    /* Layout variables */
    --header-height: 4rem;
    --sidebar-width: 280px;
    --sidebar-collapsed-width: 64px;
    --sidebar-expanded: 1;
    
    /* Default font variables */
    --font-sans: 'Inter', system-ui, sans-serif;
    --font-mono: 'Fira Code', monospace;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --primary-muted: 213.1 100% 11.6%;
    --primary-emphasis: 217.2 91.2% 70.8%;
    
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    
    --success: 142 69% 26%;
    --success-foreground: 210 40% 98%;
    
    --warning: 38 92% 40%;
    --warning-foreground: 210 40% 98%;
    
    --info: 217 91% 50%;
    --info-foreground: 210 40% 98%;
    
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

/* Make sure border styles account for dark mode properly */
@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Utility classes for common patterns */
@layer components {
  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background;
  }
  
  .with-sidebar-margin {
    @apply transition-[margin-left] duration-300;
    margin-left: calc(var(--sidebar-expanded) * var(--sidebar-width) + (1 - var(--sidebar-expanded)) * var(--sidebar-collapsed-width));
  }
}
```

## Integration with shadcn UI

shadcn UI components need updates to work with TailwindCSS 4. Here's how to adapt them:

### 1. Button Component Example

```tsx
// components-v2/ui/button.tsx
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### 2. Theme Provider Wrapper

```tsx
// components-v2/providers/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

/**
 * Theme provider wrapper for the application
 * Configures theme settings with reasonable defaults
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
```

## Migration from Previous Versions

### 1. Color System Updates

TailwindCSS 4 has a simplified color system. Update your color usage:

```diff
- bg-blue-100 text-blue-800
+ bg-primary-muted text-primary
```

### 2. Logical Properties

Use logical properties for better internationalization support:

```diff
- pl-4 pr-2 ml-4 mr-2
+ ps-4 pe-2 ms-4 me-2
```

### 3. Container Queries

Use container queries for component-level responsive design:

```tsx
<div className="@container">
  <div className="@md:flex @md:space-x-4">
    <div className="@md:w-1/2">Content</div>
    <div className="@md:w-1/2">More content</div>
  </div>
</div>
```

### 4. Dynamic Viewport Units

Use dynamic viewport units for better mobile handling:

```diff
- h-screen
+ h-dvh
```

### 5. Arbitrary Property Values

Use the new arbitrary property syntax for custom values:

```html
<div className="[--my-var:123] [mask-image:linear-gradient(to_bottom,transparent,black)]">
  Content
</div>
```

## Configuring for Mobile-First Design

### 1. Base Configuration

```ts
// tailwind.config.ts (additional settings)
{
  theme: {
    extend: {
      screens: {
        xs: '480px',
        // Default Tailwind breakpoints
        // sm: '640px',
        // md: '768px',
        // lg: '1024px',
        // xl: '1280px',
        // '2xl': '1536px',
      },
    },
  },
}
```

### 2. Mobile-First Utility Classes

```css
/* app/globals.css (additional utility classes) */
@layer utilities {
  .safe-top {
    padding-top: env(safe-area-inset-top);
  }
  
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  .touch-scrolling {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
  }
}
```

## Performance Optimization

### 1. Content Configuration

Optimize the content paths for faster builds:

```ts
// tailwind.config.ts
{
  content: {
    files: [
      './app/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
      './components-v2/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    transform: {
      // Ignore any code inside comments that start with '!'
      // Useful for documenting without affecting the output
      tsx: (content) => content.replace(/\/\*!.*?\*\//gs, ""),
    },
  }
}
```

### 2. PostCSS Configuration

```js
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 3. Bundler Configuration (Next.js)

```ts
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Use turbopack for faster development builds
    turbo: true,
  },
  // Other Next.js configuration
}

module.exports = nextConfig
```

## Usage Examples

### 1. Mobile-Responsive Card Component

```tsx
// components-v2/ui/responsive-card.tsx
import { cn } from "@/lib/utils"

interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveCard({ children, className }: ResponsiveCardProps) {
  return (
    <div className="@container">
      <div 
        className={cn(
          "rounded-lg border bg-card p-4 shadow-sm",
          "@md:p-6 @lg:p-8",
          className
        )}
      >
        <div className="@md:flex @md:gap-4">
          {children}
        </div>
      </div>
    </div>
  )
}
```

### 2. Dark Mode Toggle with Tailwind 4

```tsx
// components-v2/ui/theme-toggle.tsx
"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components-v2/ui/button"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="rounded-full"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

### 3. Responsive Layout with Logical Properties

```tsx
// components-v2/layout/content-layout.tsx
import { cn } from "@/lib/utils"

interface ContentLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function ContentLayout({ children, className }: ContentLayoutProps) {
  return (
    <div 
      className={cn(
        "w-full max-w-screen-xl mx-auto px-4 py-6",
        "sm:px-6 sm:py-8",
        "lg:px-8 lg:py-12",
        "with-sidebar-margin", // Custom utility from earlier
        className
      )}
    >
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:gap-8">
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}
```

## Debugging and Development

### 1. Tailwind Inspector

Enable the Tailwind CSS Inspector for development:

```js
// tailwind.config.js
module.exports = {
  // Only enable in development
  ...(process.env.NODE_ENV === 'development' && {
    inspector: true,
  }),
}
```

### 2. Debug Utility

```tsx
// components-v2/debug/tailwind-info.tsx
"use client"

import { useEffect, useState } from "react"

/**
 * A development utility component that shows current Tailwind breakpoint
 */
export function TailwindInfo() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Only show in development
  if (process.env.NODE_ENV !== "development" || !mounted) {
    return null
  }
  
  return (
    <div className="fixed bottom-1 end-1 z-50 flex items-center justify-center rounded-full bg-gray-800 p-2 text-xs text-white">
      <div className="block xs:hidden">xs</div>
      <div className="hidden xs:block sm:hidden">sm</div>
      <div className="hidden sm:block md:hidden">md</div>
      <div className="hidden md:block lg:hidden">lg</div>
      <div className="hidden lg:block xl:hidden">xl</div>
      <div className="hidden xl:block 2xl:hidden">2xl</div>
      <div className="hidden 2xl:block">3xl+</div>
    </div>
  )
}
```

## Testing and Validation

### 1. Component Testing with Tailwind

```tsx
// components-v2/ui/button.test.tsx
import { render, screen } from "@testing-library/react"
import { Button } from "./button"

describe("Button component", () => {
  it("renders with the correct base styles", () => {
    render(<Button>Test Button</Button>)
    const button = screen.getByRole("button", { name: "Test Button" })
    
    // Check computed styles match Tailwind classes
    const styles = window.getComputedStyle(button)
    expect(styles.display).toBe("inline-flex")
    expect(styles.alignItems).toBe("center")
    expect(styles.justifyContent).toBe("center")
  })
  
  it("applies variant styles correctly", () => {
    render(<Button variant="destructive">Destructive Button</Button>)
    const button = screen.getByRole("button", { name: "Destructive Button" })
    
    // Verify destructive styles are applied
    const styles = window.getComputedStyle(button)
    // Assert background color matches the destructive class
    // This will depend on your specific color configuration
  })
})
```

## Accessibility Considerations

- Use `prefers-color-scheme` in combination with the theme provider
- Ensure sufficient color contrast in both light and dark modes
- Test with screen readers and keyboard navigation
- Implement proper focus styles using the focus-ring utility
- Use logical properties for better RTL language support

## Integration with Next.js App Router

```tsx
// app/layout.tsx
import { ThemeProvider } from "@/components-v2/providers/theme-provider"
import { TailwindInfo } from "@/components-v2/debug/tailwind-info"
import "@/app/globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          {process.env.NODE_ENV === "development" && <TailwindInfo />}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

## Future Considerations

- Monitor TailwindCSS GitHub repository for bug fixes and updates
- Consider integrating with CSS-in-JS solutions if needed
- Explore future optimization techniques as they become available
- Keep component libraries updated with Tailwind's evolving features
- Consider creating a design system documentation site using Storybook 