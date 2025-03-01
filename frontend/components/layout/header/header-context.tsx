"use client";

import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface HeaderContextProps {
  /**
   * Whether the sidebar is expanded
   */
  isSidebarExpanded: boolean;
  
  /**
   * Whether the current viewport is mobile
   */
  isMobile: boolean;
  
  /**
   * Set whether the sidebar is expanded
   */
  setIsSidebarExpanded: (value: boolean) => void;
}

const HeaderContext = React.createContext<HeaderContextProps | undefined>(undefined);

interface HeaderProviderProps {
  /**
   * Initial sidebar expanded state
   */
  initialExpanded?: boolean;
  
  /**
   * Children components
   */
  children: React.ReactNode;
}

/**
 * Provider component for header context
 * 
 * This context manages the state related to the header, including
 * sidebar integration and responsive behavior.
 * 
 * @example
 * ```tsx
 * <HeaderProvider>
 *   <Header />
 *   <Main />
 * </HeaderProvider>
 * ```
 */
export function HeaderProvider({
  initialExpanded = true,
  children,
}: HeaderProviderProps) {
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(initialExpanded);
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // Reset sidebar state when switching between mobile and desktop
  React.useEffect(() => {
    if (isMobile) {
      setIsSidebarExpanded(false);
    } else {
      setIsSidebarExpanded(initialExpanded);
    }
  }, [isMobile, initialExpanded]);
  
  // Store sidebar expanded state in localStorage
  React.useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("sidebar-expanded", isSidebarExpanded.toString());
    }
  }, [isSidebarExpanded, isMobile]);
  
  const value = React.useMemo(
    () => ({
      isSidebarExpanded,
      isMobile,
      setIsSidebarExpanded,
    }),
    [isSidebarExpanded, isMobile]
  );
  
  return (
    <HeaderContext.Provider value={value}>
      {children}
    </HeaderContext.Provider>
  );
}

/**
 * Hook to use the header context
 * 
 * @returns Header context values
 * @throws Error if used outside of HeaderProvider
 * 
 * @example
 * ```tsx
 * const { isSidebarExpanded, isMobile } = useHeaderContext();
 * ```
 */
export function useHeaderContext(): HeaderContextProps {
  const context = React.useContext(HeaderContext);
  
  if (context === undefined) {
    throw new Error("useHeaderContext must be used within a HeaderProvider");
  }
  
  return context;
} 