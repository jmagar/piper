import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS classes
 * Combines clsx and tailwind-merge for powerful conditional class joining
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Add other utility functions as needed