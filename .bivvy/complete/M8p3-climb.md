<Climb>
  <header>
    <id>M8p3</id>
    <type>bug</type>
    <description>Fix PWA OfflineIndicator hydration mismatch when "back online" notification fades away</description>
  </header>
  <newDependencies>No new dependencies required</newDependencies>
  <prerequisitChanges>None required</prerequisitChanges>
  <relevantFiles>
    - components/offline/offline-indicator.tsx
    - components/layout/app-shell.tsx
    - app/layout.tsx (if OfflineIndicator is used there)
  </relevantFiles>
  <everythingElse>
    This climb addresses a specific PWA-related hydration error that occurs when the "back online" notification fades away.

    ## Issue: PWA Online Status Hydration Mismatch

    **Problem**: Hydration error occurs exactly when the green "we're online" dialog is supposed to fade away, causing a React tree regeneration error.

    **Root Cause**: The `OfflineIndicator` component's `AnimatePresence` exit animation creates DOM differences between server and client render:
    - Server render: No online/offline state changes, no animations
    - Client render: `navigator.onLine` evaluation triggers online state, shows/hides notification with animations
    - AnimatePresence motion components cause DOM structure differences during exit animations

    **Specific Issue Points**:
    1. **Line 24**: `setIsOnline(navigator.onLine)` runs during mount, potentially immediately setting online state
    2. **Lines 32-38**: Auto-dismissing notification after 3 seconds creates timing-sensitive DOM changes
    3. **Lines 99-144**: AnimatePresence with motion.div exit animations cause hydration mismatches
    4. **Line 18**: While `showFullNotification` starts as `false`, the timing of state changes still causes issues

    **Symptoms**:
    - Hydration error specifically when green "back online" notification fades away
    - "Server rendered HTML didn't match the client" error
    - DOM tree regeneration on client side

    ## Technical Requirements

    **Hydration Fix Requirements**:
    1. Prevent any animations from running until after full hydration
    2. Ensure server and client render identical initial DOM structure
    3. Defer all online/offline status updates until after hydration
    4. Maintain PWA functionality without breaking user experience

    **PWA Functionality Requirements**:
    1. Preserve online/offline detection and notifications
    2. Maintain accessibility and user experience
    3. Keep auto-dismissing behavior for notifications
    4. Ensure proper cleanup of event listeners

    ## Success Metrics

    1. **Zero hydration errors** when online status changes
    2. **Consistent DOM structure** between server and client initial render
    3. **Smooth animations** that only run after hydration
    4. **Proper PWA behavior** maintained for offline/online detection
    5. **No visual glitches** during initial page load

    ## Implementation Strategy

    **Hydration Safety Approach**:
    - Add additional hydration guard for animations specifically
    - Defer all `navigator.onLine` checks until after a delay post-hydration
    - Prevent AnimatePresence from running until hydration is complete
    - Use CSS-only animations as fallback during hydration period

    **Animation Timing Fix**:
    - Add `isAnimationReady` state separate from `hasMounted`
    - Delay animation initialization by a frame or two after mount
    - Use `requestAnimationFrame` to ensure DOM is stable before animations
    - Implement progressive enhancement for animations

    ## Edge Cases to Consider

    1. **Fast network state changes** during initial page load
    2. **Users with disabled JavaScript** (graceful degradation)
    3. **Slow devices** where hydration takes longer
    4. **Multiple rapid online/offline toggles** during hydration
    5. **Browser extension interference** with online state detection

    ## Testing Approach

    **Hydration Testing**:
    - Test with various network conditions during page load
    - Test rapid online/offline state changes
    - Test on slow devices where hydration is delayed
    - Test with browser dev tools network throttling

    **Animation Testing**:
    - Verify animations only start after full hydration
    - Test AnimatePresence exit animations don't cause DOM mismatches
    - Test fallback behavior when animations are disabled
    - Verify proper cleanup of animation timers

    ## Technical Considerations

    - Use `useLayoutEffect` vs `useEffect` for critical timing
    - Consider `flushSync` for immediate DOM updates when needed
    - Implement proper cleanup of all timers and event listeners
    - Ensure animations are accessible (respect `prefers-reduced-motion`)
    - Maintain performance during critical hydration phase

    ## Risk Mitigation

    - Implement CSS-only fallbacks for animations
    - Add comprehensive error boundaries around PWA components
    - Ensure graceful degradation when AnimatePresence fails
    - Test thoroughly across different browsers and devices
    - Monitor for any performance regressions during hydration

    This climb will result in a hydration-safe PWA offline indicator that provides smooth user experience without causing React tree regeneration errors.
  </everythingElse>
</Climb> 