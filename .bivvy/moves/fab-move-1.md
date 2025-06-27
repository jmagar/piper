# Move 1: Fix FAB Background and Eliminate White Square

## Goal
Fix the FAB so it displays proper primary color instead of being all white, and eliminate the rotating white square artifact underneath.

## Current Problem
- FAB appears almost entirely white instead of showing primary color
- Visible white square underneath the FAB that rotates when clicked
- shadcn/ui Button component conflicts with custom styling

## Solution Strategy
1. **Replace Button with native button** - Avoid component style conflicts
2. **Use direct CSS styling** - Bypass component defaults with custom CSS
3. **Eliminate background overlays** - Remove any div elements creating white squares
4. **Force color with !important** - Override any conflicting styles

## Implementation Details
- Convert `<Button>` to native `<button>` element
- Apply background color directly via inline styles
- Remove any wrapper divs that might be creating white squares
- Use CSS-in-JS or inline styles to ensure color shows through

## Testing
- Verify FAB shows proper primary color
- Confirm no white square visible underneath
- Test drag functionality still works
- Check rotation animations don't reveal artifacts

## Status
⏳ **READY TO IMPLEMENT** 