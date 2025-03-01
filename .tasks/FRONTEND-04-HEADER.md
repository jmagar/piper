# Header Component Implementation Guide

## Overview

The Header component serves as the primary navigation and action area at the top of the application. This implementation resolves issues with responsive behavior, ensures seamless integration with the sidebar, and provides consistent navigation while leveraging React 19 features and TailwindCSS 4.

## Component Architecture

```
components-v2/layout/
├── header/
│   ├── header.tsx               # Main header component
│   ├── header-navigation.tsx    # Navigation links component
│   ├── header-actions.tsx       # User actions and utility functions
│   ├── header-search.tsx        # Global search component
│   ├── header-mobile.tsx        # Mobile-specific implementations
│   ├── header-context.tsx       # Header state management
│   └── header-provider.tsx      # Global header state provider
└── shared/
    └── theme-switcher.tsx       # Shared theme switching component
```

## Key Features

- **Responsive design** with mobile-first approach
- **Contextual navigation** based on current route
- **Integrated search** with keyboard shortcuts
- **User profile and settings** access
- **Notification center** with real-time updates
- **Theme switching** between light and dark modes
- **Mobile optimization** with collapsible menus
- **Accessibility support** with keyboard navigation and ARIA attributes

## Implementation

### 1. Header Component

```tsx
// components-v2/layout/header/header.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { HeaderNavigation } from "./header-navigation";
import { HeaderActions } from "./header-actions";
import { HeaderSearch } from "./header-search";
import { HeaderMobile } from "./header-mobile";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSidebar } from "../sidebar/sidebar-context";
import { Logo } from "@/components-v2/ui/logo";

interface HeaderProps {
  className?: string;
}

/**
 * Main application header component
 * Adapts to desktop and mobile views
 */
export function Header({ className }: HeaderProps) {
  const pathname = usePathname();
  const isMobile = !useMediaQuery("(min-width: 768px)");
  const { isCollapsed } = useSidebar();
  
  // Get title based on current route
  const title = React.useMemo(() => {
    if (pathname.startsWith("/v2/chat")) {
      return "Chat";
    } else if (pathname.startsWith("/v2/settings")) {
      return "Settings";
    } else if (pathname.startsWith("/v2/profile")) {
      return "Profile";
    } else {
      return "Home";
    }
  }, [pathname]);
  
  if (isMobile) {
    return <HeaderMobile title={title} />;
  }
  
  return (
    <header
      className={cn(
        "fixed top-0 z-10 flex h-16 w-full items-center border-b bg-background px-4",
        "transition-[padding-left,width] duration-300",
        className
      )}
      style={{
        paddingLeft: isCollapsed 
          ? "calc(var(--sidebar-collapsed-width) + 1rem)" 
          : "calc(var(--sidebar-width) + 1rem)",
        width: isCollapsed 
          ? "calc(100% - var(--sidebar-collapsed-width))" 
          : "calc(100% - var(--sidebar-width))",
      }}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo className="hidden md:block" />
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <HeaderSearch />
          <HeaderNavigation />
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
```

### 2. Mobile Header Implementation

```tsx
// components-v2/layout/header/header-mobile.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components-v2/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components-v2/ui/sheet";
import { Menu, Search, Bell, Settings, User } from "lucide-react";
import { Logo } from "@/components-v2/ui/logo";
import { HeaderSearch } from "./header-search";
import { ThemeSwitcher } from "../shared/theme-switcher";
import Link from "next/link";

interface HeaderMobileProps {
  title: string;
  className?: string;
}

/**
 * Mobile-optimized header with responsive navigation
 */
export function HeaderMobile({ title, className }: HeaderMobileProps) {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  
  return (
    <header
      className={cn(
        "fixed top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background px-4",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Logo />
        <h1 className="text-lg font-semibold truncate max-w-[180px]">{title}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Search trigger */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          onClick={() => setIsSearchOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>
        
        {/* Menu trigger */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Menu"
          onClick={() => setIsMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Mobile search panel */}
      <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <SheetContent side="top" className="pt-16">
          <HeaderSearch
            className="w-full"
            onSearch={() => setIsSearchOpen(false)}
          />
        </SheetContent>
      </Sheet>
      
      {/* Mobile menu panel */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="right" className="p-0">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Menu</h2>
            </div>
            
            <nav className="flex flex-col p-4 gap-2">
              {[
                { href: "/v2/chat", icon: Search, label: "New Chat" },
                { href: "/v2/profile", icon: User, label: "Profile" },
                { href: "/v2/notifications", icon: Bell, label: "Notifications" },
                { href: "/v2/settings", icon: Settings, label: "Settings" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            
            <div className="mt-auto p-4 border-t">
              <div className="flex items-center justify-between">
                <span>Theme</span>
                <ThemeSwitcher />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
```

### 3. Header Search Component

```tsx
// components-v2/layout/header/header-search.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search as SearchIcon, X } from "lucide-react";
import { Input } from "@/components-v2/ui/input";
import { Button } from "@/components-v2/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components-v2/ui/command";
import { useRouter } from "next/navigation";

interface HeaderSearchProps {
  className?: string;
  onSearch?: () => void;
}

/**
 * Global search component with command palette integration
 */
export function HeaderSearch({ className, onSearch }: HeaderSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  
  // Handle keyboard shortcut to open search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // Reset search when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setSearch(""), 200);
    }
  }, [isOpen]);
  
  // Handle selecting a search result
  const handleSelect = (value: string) => {
    setIsOpen(false);
    router.push(value);
    onSearch?.();
  };
  
  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-9 w-9 md:h-10 md:w-60 md:justify-start md:px-3 md:py-2",
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        <SearchIcon className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput 
          placeholder="Search for chats, settings, or help..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Recent Chats">
            {/* Example recent chats, would be dynamic in real implementation */}
            <CommandItem onSelect={() => handleSelect("/v2/chat/recent-1")}>
              Recent Chat 1
            </CommandItem>
            <CommandItem onSelect={() => handleSelect("/v2/chat/recent-2")}>
              Recent Chat 2
            </CommandItem>
          </CommandGroup>
          
          <CommandGroup heading="Quick Navigation">
            <CommandItem onSelect={() => handleSelect("/v2/chat/new")}>
              New Chat
            </CommandItem>
            <CommandItem onSelect={() => handleSelect("/v2/settings")}>
              Settings
            </CommandItem>
            <CommandItem onSelect={() => handleSelect("/v2/profile")}>
              Profile
            </CommandItem>
          </CommandGroup>
          
          <CommandGroup heading="Help">
            <CommandItem onSelect={() => handleSelect("/v2/help")}>
              Help Center
            </CommandItem>
            <CommandItem onSelect={() => handleSelect("/v2/keyboard-shortcuts")}>
              Keyboard Shortcuts
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
```

### 4. Header Navigation Component

```tsx
// components-v2/layout/header/header-navigation.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components-v2/ui/button";

interface HeaderNavigationProps {
  className?: string;
}

/**
 * Horizontal navigation links for the header
 */
export function HeaderNavigation({ className }: HeaderNavigationProps) {
  const pathname = usePathname();
  
  // Navigation items - these would typically be dynamic
  const navItems = [
    { href: "/v2/chat", label: "Chat" },
    { href: "/v2/features", label: "Features" },
    { href: "/v2/docs", label: "Docs" },
  ];
  
  return (
    <nav className={cn("hidden md:flex items-center space-x-1", className)}>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        
        return (
          <Button
            key={item.href}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
      })}
    </nav>
  );
}
```

### 5. Header Actions Component

```tsx
// components-v2/layout/header/header-actions.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Bell, User, Settings } from "lucide-react";
import { Button } from "@/components-v2/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components-v2/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components-v2/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components-v2/ui/avatar";
import Link from "next/link";
import { ThemeSwitcher } from "../shared/theme-switcher";

interface HeaderActionsProps {
  className?: string;
}

/**
 * User-related actions component in the header
 */
export function HeaderActions({ className }: HeaderActionsProps) {
  // Get user information - this would typically come from a hook or context
  const user = {
    name: "John Doe",
    email: "john@example.com",
    image: "/avatars/user.png",
  };
  
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Notifications */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>
      
      {/* Theme Switcher */}
      <ThemeSwitcher />
      
      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="relative h-8 w-8 rounded-full"
            aria-label="User menu"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/v2/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/v2/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

### 6. Theme Switcher Component

```tsx
// components-v2/layout/shared/theme-switcher.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components-v2/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components-v2/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components-v2/ui/tooltip";

interface ThemeSwitcherProps {
  className?: string;
}

/**
 * Component for switching between light, dark, and system themes
 */
export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  
  const icon = React.useMemo(() => {
    switch (theme) {
      case "light":
        return <Sun className="h-[1.2rem] w-[1.2rem]" />;
      case "dark":
        return <Moon className="h-[1.2rem] w-[1.2rem]" />;
      default:
        return <Monitor className="h-[1.2rem] w-[1.2rem]" />;
    }
  }, [theme]);
  
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={className}
              aria-label="Toggle theme"
            >
              {icon}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {theme === "light" 
            ? "Light mode" 
            : theme === "dark" 
            ? "Dark mode" 
            : "System theme"}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-4 w-4 mr-2" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-4 w-4 mr-2" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="h-4 w-4 mr-2" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Usage Example

```tsx
// app/layout.tsx
import { SidebarProvider } from "@/components-v2/layout/sidebar/sidebar-context";
import { AppSidebar } from "@/components-v2/layout/app-sidebar";
import { Header } from "@/components-v2/layout/header/header";
import { ThemeProvider } from "next-themes";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SidebarProvider>
            <AppSidebar />
            <Header />
            <main className="pt-16 transition-[margin-left] duration-300"
                  style={{ 
                    marginLeft: "var(--sidebar-width)",
                  }}>
              {children}
            </main>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Accessibility Considerations

- All interactive elements have proper keyboard focus management
- ARIA attributes for dynamic content (e.g., dropdowns, command palette)
- Sufficient color contrast in all theme variations
- Tooltip alternatives for icon-only buttons
- Keyboard shortcuts for common actions (e.g., CMD+K for search)
- Touch targets minimum size of 44×44px for mobile interactions
- Proper focus trapping in modal dialogs and overlays
- Proper heading hierarchy for screen readers

## Testing Requirements

- Test header rendering in both desktop and mobile views
- Verify search functionality and keyboard shortcuts
- Test theme switching between light, dark, and system
- Ensure proper behavior on mobile devices
- Test keyboard navigation through all interactive elements
- Validate correct ARIA attributes for all states
- Test integration with sidebar component
- Test across different viewport sizes
- Validate theme switching works correctly for all components
- Test dropdown menus and overlays for proper positioning and behavior

## Performance Considerations

- Use React.memo for child components to prevent unnecessary re-renders
- Lazy load command palette and search results
- Implement proper skeleton states for loading data
- Cache computed values with useMemo to prevent recalculations
- Use event delegation for handling multiple click events
- Optimize theme switching to prevent layout shifts
- Minimize expensive DOM operations during transitions
- Apply will-change CSS property for animating elements
- Use content-visibility for offscreen content
- Implement proper code splitting for different header features

## Future Enhancements

- Personalized search results based on user history
- Customizable header layout with drag-and-drop organization
- Advanced notification center with filtering and grouping
- Internationalization support for multiple languages
- Context-aware commands based on current application state
- Voice search integration
- Progressive disclosure of features based on user expertise
- Customizable keyboard shortcuts
- Integration with browser history for better navigation
- Activity stream and recent actions tracking 