"use client";

import * as React from "react";

/**
 * Custom hook for detecting when an element enters the viewport
 * Useful for implementing infinite scrolling, lazy loading, etc.
 * 
 * @param rootMargin Margin around the root to adjust intersection area
 * @returns An object containing the ref to attach to the target element and the intersection state
 */
export function useIntersection(rootMargin = "0px") {
  // Create a ref to attach to the target element
  const ref = React.useRef<HTMLDivElement>(null);
  
  // Track intersection state
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  
  React.useEffect(() => {
    // Store current element reference
    const element = ref.current;
    
    // Skip effect on server or if element is not available
    if (typeof window === "undefined" || !element) return;
    
    // Create the observer
    const observer = new window.IntersectionObserver(
      (entries) => {
        // Use the first entry (our element)
        if (entries[0]) {
          setIsIntersecting(entries[0].isIntersecting);
        }
      },
      { rootMargin }
    );
    
    // Start observing the element
    observer.observe(element);
    
    // Cleanup function
    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [rootMargin]);
  
  return { ref, isIntersecting };
} 