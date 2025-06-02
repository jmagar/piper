import * as React from "react"

export function useBreakpoint(breakpoint: number) {
  // Start with false to match server rendering, then update on mount
  const [isBelowBreakpoint, setIsBelowBreakpoint] = React.useState(false)
  const [isHydrated, setIsHydrated] = React.useState(false)

  React.useEffect(() => {
    // Mark as hydrated to prevent hydration mismatch
    setIsHydrated(true)
    
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => {
      setIsBelowBreakpoint(window.innerWidth < breakpoint)
    }
    
    // Set initial value
    setIsBelowBreakpoint(window.innerWidth < breakpoint)
    
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  // Return false during SSR and until hydrated to prevent mismatch
  return isHydrated ? isBelowBreakpoint : false
}
