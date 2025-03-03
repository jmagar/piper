"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook to detect if the viewport is mobile-sized
 * Uses a media query to determine if the screen width is below 768px (standard tablet breakpoint)
 * @returns boolean indicating if the viewport is mobile-sized
 */
export function useIsMobile(): boolean {
  // Default to false for SSR
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Function to check if the window size is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set the initial value
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener("resize", checkMobile);
    
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  return isMobile;
} 