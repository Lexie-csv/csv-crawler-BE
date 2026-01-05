# Accessibility Testing Quick Reference

## 5-Minute Manual Test

### 1. Keyboard Navigation (2 min)
```bash
# Unplug mouse/trackpad
# Navigate signals page:

Tab          # Move to next interactive element
Shift+Tab    # Move to previous element
Enter/Space  # Activate buttons/links
Arrow Keys   # Navigate within dropdowns
Escape       # Close modals/dropdowns

# ✅ Check:
- [ ] All buttons/links reachable
- [ ] Focus indicator visible (blue ring)
- [ ] Logical tab order (top→bottom, left→right)
- [ ] No keyboard traps
```

### 2. Screen Reader (2 min - macOS VoiceOver)
```bash
# Enable: Cmd+F5

VO+→         # Navigate forward (VoiceOver + Right Arrow)
VO+←         # Navigate backward
VO+Shift+↓   # Enter groups
VO+Shift+↑   # Exit groups
VO+A         # Read all
VO+U         # Open rotor (headings, links, etc.)

# ✅ Listen for:
- [ ] "Loading documents..." when page loads
- [ ] "Total Documents: 1,234" for stat cards
- [ ] Document titles announced clearly
- [ ] "Load more documents. Currently showing 20 of 150" on button
- [ ] "Failed to load" announced immediately on errors
```

### 3. Color Contrast (1 min)
```bash
# Visual check or use browser DevTools

Main Text: #202020 on #FFFFFF = 16.1:1 ✅
Secondary: #727272 on #FFFFFF = 4.7:1 ✅
Caption:   #A0A0A0 on #FFFFFF = 2.9:1 ⚠️ (large text only)
Links:     #2563eb on #FFFFFF = 8.6:1 ✅

# ✅ All pass WCAG AA (4.5:1 for normal, 3:1 for large)
```

## Automated Tests (5 minutes)

### axe DevTools (Chrome Extension)
```bash
1. Install: https://chrome.google.com/webstore/detail/axe-devtools
2. Open DevTools (Cmd+Opt+I)
3. Click "axe" tab
4. Click "Scan all of my page"
5. Target: 0 violations

# Fix any Critical/Serious issues immediately
# Review Moderate/Minor issues
```

### Lighthouse Accessibility
```bash
1. Open DevTools (Cmd+Opt+I)
2. Click "Lighthouse" tab
3. Check "Accessibility" only
4. Click "Analyze page load"
5. Target: Score ≥ 95

# Review failed audits
# Focus on:
- ARIA labels
- Color contrast
- Keyboard navigation
- Semantic HTML
```

## Component-Specific Tests

### DocumentCard
```
✅ Screen reader announces: "Article: {title}. {summary}"
✅ Link says: "View source for {title} (opens in new tab)"
✅ Date is semantic <time> element
✅ Tab to link, Enter to activate
```

### StatCard
```
✅ Screen reader announces: "Region: {label}: {value}. Increased by X percent"
✅ Value updates announced via aria-live
✅ Trend announced: "Increased by 12 percent"
✅ Decorative icon hidden from screen readers
```

### SignalFilters
```
✅ Screen reader announces: "Fieldset: Filter Documents"
✅ Each filter has descriptive label
✅ Tab through all filters
✅ Arrow keys navigate dropdown options
```

### SignalList
```
✅ Loading: "Loading documents..." announced
✅ Error: "Failed to load" announced immediately (interrupts)
✅ List: "Documents feed" announced
✅ Load More: "Load more documents. Currently showing 20 of 150" announced
✅ Tab to button, Enter to load more
```

## Common Issues & Fixes

### Issue: Button not keyboard accessible
```tsx
// ❌ Bad
<div onClick={...}>Click me</div>

// ✅ Good
<button onClick={...}>Click me</button>
```

### Issue: No focus indicator
```tsx
// ❌ Bad
<button className="...">

// ✅ Good
<button className="... focus:ring-2 focus:ring-blue-600">
```

### Issue: Decorative image announced
```tsx
// ❌ Bad
<img src="icon.png" />

// ✅ Good
<img src="icon.png" alt="" />
// or
<svg aria-hidden="true">...</svg>
```

### Issue: Dynamic content not announced
```tsx
// ❌ Bad
<div>{isLoading ? 'Loading...' : data}</div>

// ✅ Good
<div role="status" aria-live="polite">
  <span className="sr-only">Loading...</span>
</div>
```

### Issue: Missing link context
```tsx
// ❌ Bad
<a href="...">View Source</a>

// ✅ Good
<a 
  href="..." 
  aria-label="View source for Document Title (opens in new tab)"
>
  View Source
</a>
```

## Quick Win Checklist

Before committing any new component:

- [ ] Use semantic HTML (`<article>`, `<section>`, `<nav>`, `<time>`, etc.)
- [ ] Add `aria-label` to buttons/links when text alone isn't descriptive
- [ ] Add `aria-hidden="true"` to decorative icons/images
- [ ] Add `focus:ring-2` to all interactive elements
- [ ] Use `role="status"` + `aria-live="polite"` for loading states
- [ ] Use `role="alert"` + `aria-live="assertive"` for errors
- [ ] Test with keyboard (Tab, Enter, Arrow keys)
- [ ] Run axe DevTools scan

## Resources

- **WCAG Quick Reference**: https://www.w3.org/WAI/WCAG21/quickref/
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **WAVE**: https://wave.webaim.org/
- **VoiceOver Guide**: https://www.apple.com/accessibility/voiceover/
- **Color Contrast Checker**: https://www.tpgi.com/color-contrast-checker/

## Need Help?

See `docs/ACCESSIBILITY_GUIDE.md` for:
- Detailed implementation examples
- Full testing procedures
- WCAG compliance checklist
- Maintenance guidelines
- Common patterns and pitfalls

---

**Last Updated:** 2025-01-15  
**WCAG Level:** AA (Target)  
**Status:** ✅ Implemented
