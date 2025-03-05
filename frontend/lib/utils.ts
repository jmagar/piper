import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names and merges Tailwind CSS classes
 * 
 * @param inputs - Class names to combine
 * @returns Merged class names string
 * 
 * @example
 * ```tsx
 * <div className={cn('text-red-500', isActive && 'bg-blue-500', className)}>
 *   Content
 * </div>
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Add other utility functions as needed