
## Codex Agent Prompt: Troubleshooting

### 1. Context & Background

The mobile burger menu in the ParentPal application is not functioning properly. Users on mobile devices cannot navigate between tabs using the hamburger menu dropdown. The issue appears to be related to JavaScript event handling and DOM manipulation in the mobile navigation system.

**Current Behavior:**
- Mobile users see a hamburger menu (☰) in the navigation header
- Clicking the hamburger menu should reveal a dropdown with navigation options
- The dropdown may not appear, or clicking menu items may not navigate properly
- Desktop navigation works correctly via horizontal tabs

**Expected Behavior:**
- Hamburger menu toggles dropdown visibility on mobile
- Dropdown shows all navigation options (Dashboard, Children, Events, Gmail Integration, Settings)
- Clicking menu items navigates to correct tabs and updates page title
- Menu closes after selection

### 2. Objective & Scope

**Goal:** Fix the mobile burger menu so it properly toggles the dropdown and enables navigation on mobile devices.

**In Scope:**
- Mobile navigation JavaScript functions in `public/index.html`
- CSS for mobile dropdown visibility
- Event handlers for mobile menu toggle and item selection
- Tab switching functionality on mobile

**Out of Scope:**
- Desktop navigation (already working)
- Backend API endpoints
- Database schema changes
- Overall UI design changes

### 3. Investigation & Steps

**Identified Issues:**
1. **DOM Element References:** The mobile menu functions may be trying to access DOM elements before they're loaded
2. **Event Handler Conflicts:** Desktop and mobile navigation may have conflicting event handlers
3. **CSS Display Logic:** Mobile dropdown visibility toggles may not be working correctly
4. **Function Scope:** Mobile navigation functions may not be properly bound to global scope

**Root Cause Analysis:**
- Console logs show the app is loading and Gmail connection is working
- The issue is likely in the `toggleMobileMenu()` and `selectMobileTab()` functions
- CSS media queries may not be properly hiding/showing mobile vs desktop navigation

**Proposed Fixes:**
1. Ensure mobile navigation functions are defined before DOM content loads
2. Add proper error handling and null checks for DOM elements
3. Fix CSS media query conflicts between mobile and desktop navigation
4. Improve event handler binding and cleanup

### 4. Testing & Validation

**Test Cases:**
1. **Mobile Menu Toggle:**
   - Open app on mobile device or narrow browser window
   - Click hamburger menu (☰)
   - Verify dropdown appears with navigation options
   - Click hamburger again, verify dropdown disappears

2. **Mobile Navigation:**
   - Click each menu item in mobile dropdown
   - Verify correct tab content loads
   - Verify page title updates correctly
   - Verify dropdown closes after selection

3. **Responsive Behavior:**
   - Test transition from desktop to mobile width
   - Verify correct navigation shows at each breakpoint
   - Test orientation changes on mobile devices

4. **Cross-browser Testing:**
   - Test on iOS Safari, Android Chrome, mobile Firefox
   - Verify touch events work properly
   - Check for JavaScript console errors

**Validation Steps:**
1. Open browser developer tools and simulate mobile device
2. Check for JavaScript errors in console
3. Verify mobile CSS media queries are applied correctly
4. Test all navigation paths work on mobile

### 5. Code Quality & Documentation

**Code Standards:**
- Follow existing JavaScript formatting in the file
- Add proper error handling with try-catch blocks
- Include null checks for DOM element access
- Add JSDoc comments for mobile navigation functions

**Documentation Updates:**
- Add comments explaining mobile navigation logic
- Document any CSS media query changes
- Update any relevant README sections

### 6. Commit & Changelog Guidelines

**Commit Message Format:**
```
fix: resolve mobile burger menu navigation issues

- Fix DOM element access timing in mobile navigation
- Add proper error handling for mobile menu toggle
- Resolve CSS conflicts between mobile and desktop nav
- Improve touch event handling on mobile devices

Fixes mobile navigation dropdown and tab switching
```

### 7. Acceptance Criteria

- [ ] Mobile hamburger menu toggles dropdown correctly
- [ ] All navigation options appear in mobile dropdown
- [ ] Clicking menu items navigates to correct tabs
- [ ] Page title updates properly on mobile navigation
- [ ] Dropdown closes after item selection
- [ ] No JavaScript console errors on mobile
- [ ] Responsive behavior works across all screen sizes
- [ ] Touch events work properly on mobile devices

### 8. Reference Docs

- `public/index.html` - Contains mobile navigation JavaScript
- `docs/specs/email_sync.md` - UI requirements and tab navigation specs
- Browser developer tools for mobile simulation and debugging
