"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

/**
 * Draggable resize handle for the sidebar
 */
export function SidebarResizeHandle() {
  const { 
    width, 
    setWidth, 
    startResizing, 
    stopResizing 
  } = useSidebar();
  
  // Handler for resize dragging
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startResizing();
    
    const startX = e.clientX;
    const startWidth = width;
    
    // Handler for mouse movement during resize
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;
      setWidth(newWidth);
    };
    
    // Handler for mouse release - cleanup
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      stopResizing();
    };
    
    // Add temporary listeners for mouse movement and release
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [width, setWidth, startResizing, stopResizing]);
  
  // Touch event handlers for mobile support
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    startResizing();
    
    const touch = e.touches[0];
    const startX = touch?.clientX ?? 0;
    const startWidth = width;
    
    // Handler for touch movement during resize
    const handleTouchMove = (e: globalThis.TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = (touch?.clientX ?? 0) - startX;
      const newWidth = startWidth + deltaX;
      setWidth(newWidth);
    };
    
    // Handler for touch end - cleanup
    const handleTouchEnd = () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      stopResizing();
    };
    
    // Add temporary listeners for touch events
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
  }, [width, setWidth, startResizing, stopResizing]);
  
  return (
    <div
      className={cn(
        "absolute right-0 top-0 h-full w-1.5 cursor-ew-resize",
        "bg-transparent transition-colors hover:bg-primary/10",
        "after:absolute after:right-0 after:top-0 after:h-full after:w-1",
        "after:bg-border after:content-['']"
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          setWidth(width - 10);
        } else if (e.key === "ArrowRight") {
          setWidth(width + 10);
        }
      }}
    />
  );
} 