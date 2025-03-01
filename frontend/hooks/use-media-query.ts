"use client";

import * as React from "react";

/**
 * Hook to check if a media query matches
 *
 * @param query - CSS media query string
 * @returns Boolean indicating if the media query matches
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery("(max-width: 768px)");
 * 
 * if (isMobile) {
 *   // Mobile-specific code
 * }
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean>(false);
  
  React.useEffect(() => {
    // Set initial value based on current window size
    const media = window.matchMedia(query);
    setMatches(media.matches);
    
    // Create a listener for when the media query changes
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Add the listener
    media.addEventListener("change", listener);
    
    // Clean up the listener on unmount
    return () => {
      media.removeEventListener("change", listener);
    };
  }, [query]);
  
  return matches;
} 