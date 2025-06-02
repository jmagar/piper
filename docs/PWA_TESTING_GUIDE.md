# PWA Testing and Validation Guide

This guide provides comprehensive testing procedures to validate the PWA implementation of Piper.

## Prerequisites

- Chrome DevTools
- Lighthouse CLI (optional): `npm install -g lighthouse`
- Multiple browsers for cross-platform testing
- Network throttling tools

## 1. Lighthouse PWA Audit

### Using Chrome DevTools

1. Open Chrome DevTools (F12)
2. Navigate to the **Lighthouse** tab
3. Select **Progressive Web App** category
4. Click **Analyze page load**

**Target Scores:**
- PWA Score: ≥ 90/100
- Performance: ≥ 80/100
- Accessibility: ≥ 90/100
- Best Practices: ≥ 90/100
- SEO: ≥ 90/100

### Using Lighthouse CLI

```bash
# Basic PWA audit
lighthouse https://your-piper-domain.com --only-categories=pwa --output=html --output-path=./pwa-report.html

# Full audit with all categories
lighthouse https://your-piper-domain.com --output=html --output-path=./full-report.html

# Performance audit with throttling
lighthouse https://your-piper-domain.com --throttling-method=devtools --throttling.cpuSlowdownMultiplier=4 --output=html
```

## 2. PWA Installation Testing

### Chrome (Desktop & Mobile)

**Desktop Chrome:**
1. Visit the Piper URL
2. Look for install icon in address bar
3. Click and verify install prompt appears
4. Complete installation
5. Verify app appears in applications/start menu
6. Launch and verify standalone mode

**Mobile Chrome:**
1. Visit Piper URL on mobile device
2. Wait for install banner (may take multiple visits)
3. Tap "Add to Home Screen"
4. Verify app icon appears on home screen
5. Launch from home screen
6. Verify fullscreen/standalone mode

### Safari (iOS)

**Manual Installation:**
1. Open Piper in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. Customize name if needed
5. Tap "Add"
6. Verify icon on home screen
7. Launch and test functionality

### Edge & Firefox

Test similar installation flows on:
- Microsoft Edge (Chromium-based)
- Firefox (limited PWA support)

## 3. Offline Functionality Testing

### Service Worker Registration

```javascript
// Check in browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});

// Check active service worker
navigator.serviceWorker.ready.then(registration => {
  console.log('Active SW:', registration.active);
});
```

### Offline Test Scenarios

**Scenario 1: Complete Offline**
1. Load Piper while online
2. Open DevTools → Network tab
3. Check "Offline" to simulate no connection
4. Refresh page
5. ✅ App should load from cache
6. ✅ Offline indicator should appear
7. ✅ Previous chats should be viewable
8. ❌ New API calls should fail gracefully

**Scenario 2: Intermittent Connection**
1. Load Piper
2. Toggle DevTools "Offline" repeatedly
3. Try sending messages during offline periods
4. Return online
5. ✅ Queued messages should sync automatically
6. ✅ UI should update with sync status

**Scenario 3: Slow Connection**
1. DevTools → Network → Throttling
2. Select "Slow 3G" or "Fast 3G"
3. Navigate through the app
4. ✅ App should remain responsive
5. ✅ Cached content should load quickly
6. ✅ Loading states should appear appropriately

### Cache Testing

```javascript
// Check caches in browser console
caches.keys().then(cacheNames => {
  console.log('Available caches:', cacheNames);
  
  cacheNames.forEach(cacheName => {
    if (cacheName.startsWith('piper-')) {
      caches.open(cacheName).then(cache => {
        cache.keys().then(requests => {
          console.log(`${cacheName} has ${requests.length} entries`);
        });
      });
    }
  });
});
```

## 4. Manifest Validation

### Verify Manifest File

1. DevTools → Application → Manifest
2. Check all required fields are present:
   - name ✅
   - short_name ✅
   - start_url ✅
   - display: "standalone" ✅
   - theme_color ✅
   - background_color ✅
   - icons (multiple sizes) ✅

### Icon Testing

**Required Sizes:**
- 72x72, 96x96, 128x128, 144x144
- 152x152, 192x192, 384x384, 512x512
- Maskable versions for adaptive icons

**Validation:**
```javascript
// Check manifest in console
fetch('/manifest.json')
  .then(r => r.json())
  .then(manifest => {
    console.log('Manifest:', manifest);
    console.log('Icons:', manifest.icons.length);
  });
```

## 5. Performance Testing

### Core Web Vitals

**First Contentful Paint (FCP)**
- Target: < 2.5 seconds
- Test: Lighthouse or DevTools Performance tab

**Largest Contentful Paint (LCP)**
- Target: < 2.5 seconds
- Test: Real User Monitoring or Lighthouse

**First Input Delay (FID)**
- Target: < 100ms
- Test: Real user interactions

**Cumulative Layout Shift (CLS)**
- Target: < 0.1
- Test: DevTools Performance tab

### Network Performance

```javascript
// Monitor performance in console
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === 'navigation') {
      console.log('Navigation timing:', {
        loadEventEnd: entry.loadEventEnd,
        domContentLoaded: entry.domContentLoadedEventEnd,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime
      });
    }
  });
});
observer.observe({entryTypes: ['navigation']});
```

## 6. Cross-Browser Testing

### Test Matrix

| Browser | Platform | Installation | Offline | Sync | Performance |
|---------|----------|-------------|---------|------|-------------|
| Chrome | Desktop | ✅ | ✅ | ✅ | ✅ |
| Chrome | Android | ✅ | ✅ | ✅ | ✅ |
| Safari | iOS | ⚠️ Manual | ✅ | ✅ | ✅ |
| Edge | Desktop | ✅ | ✅ | ✅ | ✅ |
| Firefox | Desktop | ⚠️ Limited | ✅ | ✅ | ✅ |

### Browser-Specific Issues

**Safari/iOS:**
- No beforeinstallprompt event
- Manual installation via Share → Add to Home Screen
- Limited background sync

**Firefox:**
- Limited PWA support
- Installation requires user gesture
- May not support all features

## 7. Automated Testing

### Jest Tests for PWA Components

```javascript
// tests/pwa/offline-indicator.test.tsx
import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from '@/components/offline/offline-indicator';

describe('OfflineIndicator', () => {
  it('shows offline message when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true
    });
    
    render(<OfflineIndicator />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });
});
```

### Service Worker Testing

```javascript
// tests/pwa/service-worker.test.js
describe('Service Worker', () => {
  it('registers successfully', async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');
    expect(registration).toBeDefined();
  });
  
  it('caches critical resources', async () => {
    const cache = await caches.open('piper-app-shell');
    const response = await cache.match('/');
    expect(response).toBeDefined();
  });
});
```

## 8. Testing Checklist

### Pre-Deployment

- [ ] Manifest file validates
- [ ] All required icons present and correct sizes
- [ ] Service worker registers without errors
- [ ] App works offline (basic functionality)
- [ ] Cache strategies working correctly
- [ ] Install prompt appears (Chrome/Edge)
- [ ] Performance metrics meet targets

### Post-Deployment

- [ ] Lighthouse PWA score ≥ 90
- [ ] Installation works on multiple browsers
- [ ] Offline functionality tested
- [ ] Background sync working
- [ ] Performance optimized
- [ ] Cross-platform compatibility verified

### User Acceptance Testing

- [ ] Users can install the app easily
- [ ] Offline experience is acceptable
- [ ] App feels "native" when installed
- [ ] Performance is noticeably better
- [ ] No major accessibility issues

## 9. Common Issues & Solutions

### Install Prompt Not Showing

**Causes:**
- HTTPS requirement not met
- Manifest file issues
- Service worker not registered
- Already dismissed by user

**Solutions:**
- Verify HTTPS connection
- Validate manifest with DevTools
- Check service worker registration
- Clear browser data and test

### Offline Functionality Not Working

**Causes:**
- Service worker not activated
- Cache strategies misconfigured
- Network requests not intercepted

**Solutions:**
- Check service worker status in DevTools
- Verify cache entries exist
- Test fetch event handling

### Poor Performance Scores

**Causes:**
- Large bundle sizes
- Unoptimized images
- Blocking resources
- Layout shifts

**Solutions:**
- Analyze bundle with webpack-bundle-analyzer
- Optimize images and use WebP
- Lazy load non-critical resources
- Use skeleton screens

## 10. Debugging Tools

### Chrome DevTools

**Application Tab:**
- Service Workers status
- Cache Storage inspection
- Manifest validation
- Storage usage

**Network Tab:**
- Service worker intercepted requests
- Cache hits/misses
- Offline simulation

**Lighthouse Tab:**
- PWA audit results
- Performance recommendations
- Accessibility issues

### Console Commands

```javascript
// Clear all caches
caches.keys().then(keys => 
  Promise.all(keys.map(key => caches.delete(key)))
);

// Force service worker update
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.update());
});

// Check PWA install criteria
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA install criteria met');
});
```

## 11. Success Metrics

### Technical Metrics

- **Lighthouse PWA Score:** ≥ 90/100
- **Performance Score:** ≥ 80/100
- **First Contentful Paint:** < 2.5s
- **Time to Interactive:** < 3.5s
- **Offline Functionality:** 95% features available

### User Metrics

- **Install Rate:** Track installation events
- **Offline Usage:** Monitor offline interactions
- **Retention:** Compare PWA vs web usage
- **Performance:** User-perceived performance improvements

---

This testing guide ensures comprehensive validation of your PWA implementation. Run through each section systematically to identify and resolve any issues before production deployment. 