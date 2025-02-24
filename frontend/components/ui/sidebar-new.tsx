"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarContextValue {
  isOpen: boolean;
  toggle: () => void;
  isMobile: boolean;
  openMobile: boolean;
  setOpenMobile: (state: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined);

interface SidebarBaseProps {
  children: React.ReactNode;
  className?: string;
}

interface SidebarComponentProps extends React.ComponentProps<"div"> {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}

const sidebarMenuButtonVariants = cva(
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: "hover:bg-accent/50",
        outline: "border border-input hover:bg-accent/50",
      },
      size: {
        default: "h-9",
        sm: "h-8 text-xs",
        lg: "h-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true);
  const [openMobile, setOpenMobile] = React.useState(false);
  const isMobile = useIsMobile();
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), []);

  const value = React.useMemo(() => ({
    isOpen,
    toggle,
    isMobile,
    openMobile,
    setOpenMobile
  }), [isOpen, toggle, isMobile, openMobile]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

function SidebarBase({ children, className }: SidebarBaseProps) {
  const { isOpen } = useSidebar();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen w-64 transform transition-transform duration-200',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        className
      )}
    >
      {children}
    </aside>
  );
}

function SidebarTrigger({ children, className }: SidebarBaseProps) {
  const { toggle } = useSidebar();

  return (
    <button
      onClick={toggle}
      className={cn('flex items-center justify-center', className)}
    >
      {children}
    </button>
  );
}

function SidebarContent({ children, className }: SidebarBaseProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto p-4', className)}>
      {children}
    </div>
  );
}

function SidebarGroup({ children, className }: SidebarBaseProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {children}
    </div>
  );
}

function SidebarGroupLabel({ children, className }: SidebarBaseProps) {
  return (
    <div className={cn('text-sm font-medium text-muted-foreground', className)}>
      {children}
    </div>
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <header
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex h-14 items-center border-b px-4 bg-sidebar-accent/50", className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 border-t p-4 bg-sidebar-accent/50", className)}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  )
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  size = "default",
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot : "button"

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        className
      )}
      {...props}
    />
  )

  if (!tooltip) {
    return button
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        {...tooltip}
      />
    </Tooltip>
  )
}

function SidebarMain({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: SidebarComponentProps) {
  const { isMobile, openMobile, setOpenMobile, isOpen } = useSidebar()

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-64 flex-col border-r",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetHeader className="sr-only">
          <SheetTitle>Sidebar</SheetTitle>
          <SheetDescription>Displays the mobile sidebar.</SheetDescription>
        </SheetHeader>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-72 p-0 [&>button]:hidden"
          side={side}
        >
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <nav
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r bg-background transition-transform duration-200 ease-in-out",
        !isOpen && "-translate-x-full",
        className
      )}
      data-state={isOpen ? "expanded" : "collapsed"}
      data-collapsible={!isOpen ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
      {...props}
    >
      {children}
    </nav>
  )
}

function SidebarInset({ children, className }: SidebarBaseProps) {
  return (
    <div className={cn("relative -mx-4 p-4 bg-muted", className)}>
      {children}
    </div>
  );
}

function SidebarMenuSub({ children, className }: SidebarBaseProps) {
  return (
    <div className={cn("pl-6", className)}>
      {children}
    </div>
  );
}

function SidebarMenuSubButton({
  className,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof sidebarMenuButtonVariants>) {
  return (
    <button
      className={cn(sidebarMenuButtonVariants({ className }))}
      {...props}
    />
  );
}

function SidebarMenuSubItem({ children, className }: SidebarBaseProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {children}
    </div>
  );
}

function SidebarMenuAction({
  className,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof sidebarMenuButtonVariants>) {
  return (
    <button
      className={cn(sidebarMenuButtonVariants({ className }), "justify-between")}
      {...props}
    />
  );
}

export {
  SidebarMain as Sidebar,
  SidebarBase,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuAction,
} 