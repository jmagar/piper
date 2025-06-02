# Piper PWA Icons Guide

This directory contains all icons required for the Piper Progressive Web App.

## Required Icon Sizes

### Standard PWA Icons
- `icon-72x72.png` - 72x72 pixels
- `icon-96x96.png` - 96x96 pixels
- `icon-128x128.png` - 128x128 pixels
- `icon-144x144.png` - 144x144 pixels
- `icon-152x152.png` - 152x152 pixels
- `icon-192x192.png` - 192x192 pixels
- `icon-384x384.png` - 384x384 pixels
- `icon-512x512.png` - 512x512 pixels

### Maskable Icons (for adaptive icons)
- `icon-192x192-maskable.png` - 192x192 pixels with safe zone
- `icon-512x512-maskable.png` - 512x512 pixels with safe zone

### Favicons
- `favicon-16x16.png` - 16x16 pixels
- `favicon-32x32.png` - 32x32 pixels
- `favicon-48x48.png` - 48x48 pixels
- `favicon.ico` - Multi-size ICO file

### Apple Touch Icons
- `apple-touch-icon.png` - 180x180 pixels
- `apple-touch-icon-precomposed.png` - 180x180 pixels (precomposed)

### App Shortcut Icons
- `shortcut-new-chat.png` - 96x96 pixels
- `shortcut-history.png` - 96x96 pixels

## Design Guidelines

### Maskable Icons
- Use a safe zone of 40% (20% on each side)
- Ensure important content stays within the safe zone
- Background should extend to edges for full bleed effect

### Color Scheme
- Primary: Brand colors from Piper design system
- Background: White or brand background color
- Ensure good contrast for visibility

### Style Guidelines
- Clean, modern design consistent with Piper branding
- Scalable design that works at all sizes
- High contrast for small sizes (16x16, 32x32)

## Generation Tools

Recommended tools for creating these icons:
- [PWA Builder](https://www.pwabuilder.com/) - Automatic icon generation
- [RealFaviconGenerator](https://realfavicongenerator.net/) - Comprehensive favicon package
- [Maskable.app](https://maskable.app/) - Test maskable icons

## Implementation Status

- [ ] Standard PWA icons (72x72 to 512x512)
- [ ] Maskable icons for adaptive icon support
- [ ] Favicon set for browser compatibility
- [ ] Apple Touch icons for iOS compatibility
- [ ] Shortcut icons for app shortcuts

## Notes

Icons should be optimized PNG files with appropriate compression.
For production, consider using WebP format for better compression where supported. 