<Climb>
  <header>
    <id>N5w8</id>
    <type>bug</type>
    <description>Fix PWA OfflineIndicator hydration without throttling user experience</description>
  </header>
  <newDependencies>No new dependencies required</newDependencies>
  <prerequisitChanges>Remove the aggressive throttling approach from M8p3</prerequisitChanges>
  <relevantFiles>
    - components/offline/offline-indicator.tsx
    - components/layout/app-shell.tsx
  </relevantFiles>
  <everythingElse>
    This climb fixes the PWA hydration issue using a surgical approach that maintains excellent user experience.

    ## Problem with Previous Approach

    **Issue**: The M8p3 solution used aggressive throttling (1+ second delays) which destroys user experience.
    - 300ms + 1000ms delays before notifications can appear
    - Users won't see important "back online" notifications promptly
    - PWA responsiveness feels sluggish and broken

    ## Root Cause Analysis

    **The Real Issue**: AnimatePresence exit animations cause hydration mismatches because:
    1. Server renders static DOM (no animations)
    2. Client immediately starts exit animations during hydration
    3. Motion components create different DOM structures than server

    **The Fix**: Prevent ONLY the problematic animations during hydration, not delay functionality.

    ## Surgical Solution Strategy

    **Approach 1 - Animation-Only Guards**:
    - Allow immediate functionality (online detection, notifications)
    - Block only the AnimatePresence animations until hydration completes
    - Use CSS transitions as immediate fallback during hydration
    - Switch to full animations after hydration (fast)

    **Approach 2 - Static First Render**:
    - Always render static version on first mount
    - Immediately enable functionality
    - Progressively enhance with animations after 1-2 animation frames
    - No delays in user-facing features

    **Approach 3 - Remove AnimatePresence During Hydration**:
    - Conditionally use AnimatePresence only after hydration
    - Use regular div with CSS transitions during hydration
    - Swap to motion components seamlessly after mount

    ## Success Metrics

    1. **Zero hydration errors** - animations don't cause DOM mismatches
    2. **Immediate functionality** - notifications appear without delay
    3. **Smooth animations** - full animations after hydration completes
    4. **No UX throttling** - responsive PWA behavior maintained
    5. **Clean code** - elegant solution without complex timing logic

    ## Implementation Strategy

    **Primary Approach**: Replace AnimatePresence with CSS-only animations during hydration:
    - Use CSS transitions for immediate smooth animations
    - Switch to Framer Motion after hydration for enhanced animations
    - Maintain all functionality without delays
    - Progressive enhancement pattern

    **Fallback Approach**: Conditional animation rendering:
    - Render static content immediately with CSS animations
    - Layer on Framer Motion animations after hydration
    - No impact on notification timing or functionality

    This will provide the best of both worlds: immediate functionality with smooth animations after hydration.
  </everythingElse>
</Climb> 