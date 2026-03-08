# Visual Consistency Audit Report
**Date:** February 17, 2026  
**Scope:** Complete app-wide visual consistency audit (READ ONLY)  
**Status:** Comprehensive findings documented

---

## Executive Summary

This audit examined visual consistency across the entire DailyFitness application, covering loading states, empty states, error handling, button/input consistency, typography, colors, navigation, animations, mobile responsiveness, and placeholder content.

**Total Issues Found:** 37 unique issues (some appear in multiple categories)  
**High Severity:** 6  
**Medium Severity:** 17  
**Low Severity:** 14

---

## 1. Loading States

### Findings

**Patterns Identified:**

1. **Skeleton/Shimmer Loading (Most Common)**
   - **Location:** Most client pages (`/client/page.tsx`, `/client/progress/*`, `/client/nutrition/*`, `/client/workouts/*`)
   - **Pattern:** Uses `animate-pulse` with `bg-[color:var(--fc-glass-highlight)]` rectangles
   - **Consistency:** ✅ Good - consistent across client pages
   - **Example:**
     ```tsx
     <div className="animate-pulse space-y-4">
       <div className="h-6 w-40 rounded-full bg-[color:var(--fc-glass-highlight)]" />
       <div className="h-10 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
     </div>
     ```

2. **Inline Loading (Some Coach Pages)**
   - **Location:** `/coach/sessions/page.tsx`
   - **Pattern:** Uses inline styles with hardcoded colors (`backgroundColor: '#E8E9F3'`, `backgroundColor: '#FFFFFF'`)
   - **Issue:** ❌ **HIGH** - Uses hardcoded colors instead of theme variables
   - **Inconsistency:** Different from rest of app (uses theme variables)

3. **No Loading State (Some Pages)**
   - **Location:** Some coach client detail pages (`/coach/clients/[id]/page.tsx`)
   - **Pattern:** Shows blank screen or partial content during load
   - **Issue:** ⚠️ **MEDIUM** - Poor UX, user doesn't know if page is loading

4. **Loading Component Usage**
   - **Standard:** Most pages use `AnimatedBackground` + skeleton pattern
   - **Exception:** `/coach/sessions/page.tsx` uses custom inline styles
   - **Missing:** No shared `LoadingSkeleton` component (each page implements own)

### Issues

| Location | Issue | Severity | Screenshot Description |
|----------|-------|----------|------------------------|
| `src/app/coach/sessions/page.tsx` | Uses hardcoded colors (`#E8E9F3`, `#FFFFFF`) instead of theme variables | **HIGH** | Loading state shows white background with hardcoded slate colors, doesn't respect dark mode |
| `src/app/coach/clients/[id]/page.tsx` | Minimal loading state - shows blank/partial content | **MEDIUM** | Page appears broken during load, no skeleton |
| `src/app/client/train/page.tsx` | No explicit loading skeleton - relies on empty state | **MEDIUM** | Shows "No program" state immediately, then updates when data loads (confusing) |
| Multiple pages | No shared loading component - each implements own skeleton | **LOW** | Inconsistent skeleton heights and spacing across pages |

### Recommendations

1. **Create shared `LoadingSkeleton` component** for consistent loading states
2. **Fix `/coach/sessions/page.tsx`** to use theme variables
3. **Add explicit loading states** to pages that show blank during load
4. **Standardize skeleton patterns** (height, spacing, animation)

---

## 2. Empty States

### Findings

**Patterns Identified:**

1. **Well-Designed Empty States (Most Common)**
   - **Location:** `/client/progress/body-metrics/page.tsx`, `/client/progress/personal-records/page.tsx`, `/client/nutrition/meals/[id]/page.tsx`
   - **Pattern:** Icon + title + description + CTA button
   - **Example:**
     ```tsx
     <div className="fc-surface p-10 rounded-2xl text-center">
       <Scale className="h-10 w-10 fc-text-subtle" />
       <h2>No measurements yet</h2>
       <p>Log weight, waist, and body fat to see trends over time.</p>
       <Button onClick={...}>Log first measurement</Button>
     </div>
     ```
   - **Consistency:** ✅ Good - consistent pattern across most pages

2. **Empty States with Context-Aware Messages**
   - **Location:** `/components/coach/OptimizedExerciseLibrary.tsx`, `/components/coach/OptimizedAdherenceTracking.tsx`
   - **Pattern:** Different messages for "no data" vs "filtered out"
   - **Example:** "No exercises yet" vs "No exercises found"
   - **Consistency:** ✅ Good - helpful UX

3. **Missing Empty States**
   - **Location:** Some coach pages (`/coach/programs/page.tsx`, `/coach/workouts/templates/page.tsx`)
   - **Issue:** ⚠️ **MEDIUM** - Shows blank area or just "No data" text
   - **Impact:** User doesn't know what to do next

4. **Inconsistent Empty State Styling**
   - **Location:** Various pages
   - **Issues:**
     - Some use `fc-surface`, others use `fc-glass`
     - Padding varies: `p-8`, `p-10`, `py-12`
     - Icon sizes vary: `w-10 h-10`, `w-16 h-16`, `w-20 h-20`
     - Text sizes vary: `text-lg`, `text-xl`, `text-2xl`

### Issues

| Location | Issue | Severity | Screenshot Description |
|----------|-------|----------|------------------------|
| `src/app/coach/programs/page.tsx` | No empty state - shows blank area | **MEDIUM** | Empty list shows nothing, no guidance |
| `src/app/coach/workouts/templates/page.tsx` | Minimal empty state - just text | **MEDIUM** | Shows "No templates" text only, no icon/CTA |
| `src/app/client/progress/analytics/page.tsx` | Some sections show blank when no data | **MEDIUM** | Chart sections disappear entirely, no empty message |
| `src/components/coach/ClientComplianceDashboard.tsx` | Empty state uses old styling (`text-slate-800`) | **MEDIUM** | Uses hardcoded colors instead of theme variables |
| Multiple pages | Inconsistent empty state padding/sizing | **LOW** | Some `p-8`, others `p-10`, icon sizes vary |

### Recommendations

1. **Create shared `EmptyState` component** with consistent styling
2. **Add empty states** to all list/detail pages
3. **Standardize empty state dimensions** (icon size, padding, text sizes)
4. **Ensure all empty states** include helpful CTAs when applicable

---

## 3. Error States

### Findings

**Patterns Identified:**

1. **Error Handling with Retry (Good Pattern)**
   - **Location:** Most client pages (`/client/nutrition/*`, `/client/progress/*`, `/client/profile/page.tsx`)
   - **Pattern:** Error message + Retry button + Back button
   - **Example:**
     ```tsx
     if (loadError) {
       return (
         <div className="fc-surface rounded-2xl p-8 text-center">
           <p className="fc-text-dim mb-4">{loadError}</p>
           <Button onClick={retry}>Retry</Button>
           <Button onClick={goBack}>Back</Button>
         </div>
       );
     }
     ```
   - **Consistency:** ✅ Good - consistent pattern

2. **Timeout Handling**
   - **Location:** `/client/nutrition/page.tsx`, `/client/profile/page.tsx`
   - **Pattern:** Uses `withTimeout` helper (25-30s timeout)
   - **Implementation:** ✅ Good - prevents infinite loading

3. **Silent Failures**
   - **Location:** Some coach pages (`/coach/clients/[id]/page.tsx`)
   - **Issue:** ⚠️ **HIGH** - Errors logged to console but user sees blank/broken page
   - **Impact:** User doesn't know what went wrong

4. **Inconsistent Error Display**
   - **Location:** Various pages
   - **Issues:**
     - Some show error in toast, others inline
     - Some have retry buttons, others don't
     - Error messages vary in tone/formality

### Issues

| Location | Issue | Severity | Screenshot Description |
|----------|-------|----------|------------------------|
| `src/app/coach/clients/[id]/page.tsx` | Errors logged but not displayed to user | **HIGH** | Page shows blank/broken state, no error message |
| `src/app/client/train/page.tsx` | Error state shows "No program" instead of actual error | **HIGH** | User thinks there's no program when actually there's an error |
| `src/app/coach/sessions/page.tsx` | No error handling - page could hang forever | **MEDIUM** | No timeout, no error state, no retry option |
| Multiple pages | Inconsistent error message styling | **LOW** | Some use `fc-text-dim`, others use `text-red-500` |

### Recommendations

1. **Add error states** to all pages that currently fail silently
2. **Standardize error component** with consistent styling and retry option
3. **Add timeout handling** to all data-fetching pages
4. **Ensure all errors** are user-friendly (not technical)

---

## 4. Button & Input Consistency

### Findings

**Button Patterns:**

1. **Theme-Based Buttons (Most Common)**
   - **Pattern:** Uses `fc-btn fc-btn-primary`, `fc-btn-secondary`, `fc-btn-ghost`
   - **Location:** Most pages
   - **Consistency:** ✅ Good - consistent across app

2. **Component Library Buttons**
   - **Pattern:** Uses `<Button>` component from `@/components/ui/button`
   - **Variants:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `fc-primary`, `fc-secondary`, `fc-ghost`, `fc-destructive`
   - **Location:** Mixed usage
   - **Issue:** ⚠️ **MEDIUM** - Two button systems coexist

3. **Hardcoded Button Styles**
   - **Location:** `/coach/sessions/page.tsx`, some coach pages
   - **Pattern:** Inline styles or custom classes
   - **Issue:** ❌ **HIGH** - Breaks consistency

4. **Button Size Inconsistencies**
   - **Findings:**
     - Some buttons: `h-9`, `h-10`, `h-11`, `h-12`
     - Padding varies: `px-4 py-2`, `px-6 py-3`, `px-8 py-4`
     - Border radius varies: `rounded-xl`, `rounded-2xl`, `rounded-full`

**Input Patterns:**

1. **Theme-Based Inputs**
   - **Pattern:** Uses `fc-input` class
   - **Location:** Most pages
   - **Consistency:** ✅ Good

2. **Component Library Inputs**
   - **Pattern:** Uses `<Input>` component from `@/components/ui/input`
   - **Variants:** `default`, `fc`
   - **Location:** Mixed usage

3. **Input Height Inconsistencies**
   - **Findings:**
     - Default: `h-9` (36px)
     - FC variant: `h-12` (48px)
     - Some custom: `h-11`, `h-14`
   - **Issue:** ⚠️ **MEDIUM** - Inconsistent heights across pages

### Issues

| Location | Issue | Severity | Screenshot Description |
|----------|-------|----------|------------------------|
| `src/app/coach/sessions/page.tsx` | Uses hardcoded button styles (`backgroundColor: '#FFFFFF'`) | **HIGH** | Buttons don't match rest of app, break dark mode |
| `src/app/coach/clients/page.tsx` | Search input uses `h-14` (56px) - taller than standard | **MEDIUM** | Input is noticeably taller than other inputs |
| `src/app/client/progress/body-metrics/page.tsx` | Uses both `fc-btn` classes and `<Button>` component | **MEDIUM** | Inconsistent button styling on same page |
| Multiple pages | Button padding varies (`px-4 py-2` vs `px-6 py-3`) | **LOW** | Buttons look slightly different sizes |

### Recommendations

1. **Standardize on `<Button>` component** - remove `fc-btn` classes
2. **Fix hardcoded styles** in `/coach/sessions/page.tsx`
3. **Standardize input heights** - use `h-11` (44px) for touch targets
4. **Create button size tokens** for consistent padding/border-radius

---

## 5. Typography & Spacing

### Findings

**Typography Patterns:**

1. **Page Titles**
   - **Client pages:** Mostly `text-2xl` or `text-3xl` with `font-bold`
   - **Coach pages:** Mix of `text-2xl`, `text-3xl`, some use CSS variable `var(--fc-type-h2)`
   - **Issue:** ⚠️ **MEDIUM** - Inconsistent heading sizes

2. **Section Headers**
   - **Pattern:** Mix of `text-lg`, `text-xl`, `text-sm font-semibold uppercase`
   - **Inconsistency:** Some use uppercase tracking-widest, others don't

3. **Body Text**
   - **Pattern:** Mostly `text-sm` or `text-base`
   - **Consistency:** ✅ Good

4. **Font Weights**
   - **Pattern:** Mix of `font-medium`, `font-semibold`, `font-bold`, `font-extrabold`
   - **Issue:** ⚠️ **LOW** - No clear hierarchy

**Spacing Patterns:**

1. **Page Padding**
   - **Client pages:** Mostly `px-4 pb-24 pt-6 sm:px-6 lg:px-10`
   - **Coach pages:** Mix of `p-6`, `px-6 pt-10`, `p-4`
   - **Issue:** ⚠️ **MEDIUM** - Inconsistent padding

2. **Section Spacing**
   - **Pattern:** Mix of `space-y-4`, `space-y-6`, `space-y-8`, `gap-4`, `gap-6`
   - **Issue:** ⚠️ **LOW** - No clear spacing scale

3. **Bottom Padding for Nav**
   - **Pattern:** `pb-24`, `pb-28`, `pb-32`, `pb-40`
   - **Issue:** ⚠️ **MEDIUM** - Some pages content hidden behind bottom nav

### Issues

| Location | Issue | Severity | Screenshot Description |
|----------|-------|----------|------------------------|
| `src/app/client/page.tsx` | Uses CSS variable `var(--fc-type-h2)` for title | **MEDIUM** | Title size depends on CSS variable, not consistent with other pages |
| `src/app/coach/page.tsx` | Title uses `text-2xl font-extrabold` | **MEDIUM** | Different weight than client dashboard |
| `src/app/coach/sessions/page.tsx` | Uses `padding: '24px 20px'` inline style | **HIGH** | Hardcoded spacing, doesn't match theme |
| Multiple pages | Bottom padding varies (`pb-24` vs `pb-32`) | **MEDIUM** | Some pages content cut off by bottom nav |
| `src/app/client/progress/analytics/page.tsx` | Section spacing inconsistent (`space-y-6` vs `space-y-8`) | **LOW** | Visual rhythm feels off |

### Recommendations

1. **Standardize heading sizes** - H1: `text-3xl`, H2: `text-2xl`, H3: `text-xl`
2. **Create spacing scale** - Use consistent `space-y-6` or `space-y-8` for sections
3. **Standardize bottom padding** - Use `pb-32` consistently for bottom nav clearance
4. **Remove inline styles** - Use Tailwind classes or theme variables

---

## 6. Color Consistency

### Findings

**Theme Variable Usage:**

1. **Good Theme Variable Usage (Most Pages)**
   - **Pattern:** Uses `fc-text-primary`, `fc-text-dim`, `fc-surface`, `fc-glass`, etc.
   - **Location:** Most client and coach pages
   - **Consistency:** ✅ Good

2. **Hardcoded Colors (Problem Areas)**
   - **Location:** `/coach/sessions/page.tsx`
   - **Pattern:** Uses `backgroundColor: '#E8E9F3'`, `backgroundColor: '#FFFFFF'`, `border: '1px solid #E5E7EB'`
   - **Issue:** ❌ **HIGH** - Breaks dark mode, doesn't match theme

3. **Status Colors**
   - **Pattern:** Uses `fc-status-success`, `fc-status-warning`, `fc-status-error`
   - **Consistency:** ✅ Good - consistent across app

4. **Gradient Colors**
   - **Location:** Various pages
   - **Pattern:** Some use hardcoded gradients (`from-violet-500 to-purple-600`), others use theme
   - **Issue:** ⚠️ **MEDIUM** - Inconsistent gradient usage

### Issues

| Location | Issue | Severity | Screenshot Description |
|----------|-------|----------|------------------------|
| `src/app/coach/sessions/page.tsx` | Extensive hardcoded colors (`#E8E9F3`, `#FFFFFF`, `#E5E7EB`) | **HIGH** | Entire page uses hardcoded colors, breaks dark mode |
| `src/components/coach/ClientComplianceDashboard.tsx` | Uses `text-slate-800`, `text-slate-600` | **MEDIUM** | Hardcoded colors instead of theme variables |
| `src/app/coach/sessions/page.tsx` | Uses hardcoded gradients (`from-violet-500`, `from-blue-500`) | **MEDIUM** | Gradients don't match theme system |
| Multiple pages | Some use `bg-white`, `text-black` directly | **LOW** | Should use theme variables for dark mode support |

### Recommendations

1. **Fix `/coach/sessions/page.tsx`** - Replace all hardcoded colors with theme variables
2. **Audit all hardcoded colors** - Replace with theme equivalents
3. **Create gradient tokens** - Standardize gradient usage
4. **Ensure dark mode support** - All colors should respect theme

---

## 7. Navigation & Layout

### Findings

**Bottom Navigation:**

1. **Consistency**
   - **Pattern:** Uses `BottomNav` component consistently
   - **Visibility:** Hidden on workout execution pages (correct)
   - **Active States:** ✅ Good - consistent highlighting
   - **Issue:** None found

2. **Page Headers**
   - **Pattern:** Most pages have back button + title + actions
   - **Consistency:** ✅ Good - consistent pattern
   - **Variations:**
     - Some use `ArrowLeft` icon, others use `ChevronLeft`
     - Title sizes vary (see Typography section)

3. **Page Containers**
   - **Pattern:** Most use `max-w-6xl` or `max-w-7xl` with `mx-auto`
   - **Consistency:** ✅ Good

4. **Card/Container Styling**
   - **Pattern:** Uses `fc-surface`, `fc-glass`, `rounded-2xl`, `border border-[color:var(--fc-surface-card-border)]`
   - **Consistency:** ✅ Good - consistent across app

### Issues

| Location | Issue | Severity | Screenshot Description |
|----------|-------|----------|------------------------|
| `src/app/coach/sessions/page.tsx` | Uses inline styles for containers | **HIGH** | Containers styled with inline styles, not theme classes |
| `src/app/client/progress/body-metrics/page.tsx` | Header uses `ChevronRight` for breadcrumb | **LOW** | Inconsistent icon choice (should be `ChevronLeft` or `ArrowLeft`) |
| Multiple pages | Some pages missing back button in header | **LOW** | Navigation inconsistency |

### Recommendations

1. **Fix `/coach/sessions/page.tsx`** - Use theme classes instead of inline styles
2. **Standardize header icons** - Use `ArrowLeft` consistently for back buttons
3. **Ensure all pages** have consistent header structure

---

## 8. Animations & Transitions

### Findings

**Animation Patterns:**

1. **Loading Animations**
   - **Pattern:** Uses `animate-pulse` for skeletons
   - **Consistency:** ✅ Good - consistent across app

2. **Button Animations**
   - **Pattern:** Uses `transition-all duration-300`, `hover:scale-[0.94]`, `active:scale-[0.94]`
   - **Consistency:** ✅ Good - consistent in button component

3. **Page Transitions**
   - **Pattern:** No explicit page transitions (Next.js default)
   - **Issue:** ⚠️ **LOW** - Could feel jarring on slow connections

4. **Modal/Drawer Animations**
   - **Pattern:** Uses `ResponsiveModal` component
   - **Consistency:** ✅ Good - consistent animations

5. **Missing Animations**
   - **Location:** Some elements appear without animation
   - **Issue:** ⚠️ **LOW** - Could feel abrupt

### Issues

| Location | Issue | Severity | Screenshot Description |
|----------|-------|----------|------------------------|
| `src/app/client/train/page.tsx` | Content appears/disappears without animation | **LOW** | State changes feel abrupt |
| `src/app/client/progress/analytics/page.tsx` | Chart sections appear without fade-in | **LOW** | Could feel jarring |

### Recommendations

1. **Add fade-in animations** for content that loads dynamically
2. **Ensure consistent transition durations** (300ms standard)
3. **Add loading state transitions** for smoother UX

---

## 9. Mobile-Specific Issues

### Findings

**Touch Targets:**

1. **Button Sizes**
   - **Pattern:** Most buttons are `h-9` (36px) or `h-10` (40px)
   - **Issue:** ⚠️ **MEDIUM** - Some buttons below 44px minimum
   - **WCAG:** Minimum 44x44px for touch targets

2. **Input Heights**
   - **Pattern:** Mix of `h-9` (36px), `h-11` (44px), `h-12` (48px), `h-14` (56px)
   - **Issue:** ⚠️ **MEDIUM** - Some inputs too small for mobile

3. **Horizontal Scroll**
   - **Findings:** No obvious horizontal scroll issues found
   - **Status:** ✅ Good

4. **Viewport Overflow**
   - **Findings:** Some pages use `pb-24` which may not be enough
   - **Issue:** ⚠️ **MEDIUM** - Content hidden behind bottom nav

5. **Keyboard Behavior**
   - **Findings:** No explicit keyboard handling found
   - **Issue:** ⚠️ **LOW** - May need testing

### Issues

| Location | Issue | Severity | Screenshot Description |
|----------|-------|----------|------------------------|
| Multiple pages | Buttons `h-9` (36px) below 44px minimum | **MEDIUM** | Touch targets too small on mobile |
| `src/app/client/progress/body-metrics/page.tsx` | Some buttons use `h-8` | **MEDIUM** | Too small for mobile touch |
| `src/app/client/progress/analytics/page.tsx` | Bottom padding `pb-24` may be insufficient | **MEDIUM** | Content may be hidden behind nav |
| `src/app/coach/clients/page.tsx` | Filter buttons may be too small on mobile | **LOW** | Touch targets could be larger |

### Recommendations

1. **Increase button heights** to minimum 44px (`h-11`) for mobile
2. **Standardize input heights** to `h-11` (44px) minimum
3. **Increase bottom padding** to `pb-32` consistently
4. **Test keyboard behavior** on all forms

---

## 10. Placeholder/Mock Content

### Findings

**Remaining Placeholders:**

1. **"Coming Soon" Labels**
   - **Findings:** No "Coming soon" labels found in main app pages
   - **Status:** ✅ Good

2. **Lorem Ipsum**
   - **Findings:** No Lorem ipsum text found
   - **Status:** ✅ Good

3. **Hardcoded Sample Data**
   - **Location:** `/components/coach/OptimizedAdherenceTracking.tsx` (FIXED - now uses real data)
   - **Status:** ✅ Fixed

4. **Disabled Buttons**
   - **Findings:** Some buttons disabled without explanation
   - **Issue:** ⚠️ **LOW** - Should show tooltip/explanation

5. **Placeholder Usernames/Dates**
   - **Findings:** No hardcoded usernames found
   - **Status:** ✅ Good

### Issues

| Location | Issue | Severity | Screenshot Description |
|----------|-------|----------|------------------------|
| `src/app/client/progress/body-metrics/page.tsx` | Goal target shows "— kg" (no goal set) | **LOW** | Disabled state, but no explanation |
| Multiple pages | Some buttons disabled without tooltip | **LOW** | User doesn't know why button is disabled |

### Recommendations

1. **Add tooltips** to disabled buttons explaining why
2. **Replace placeholder values** with helpful messages (e.g., "Set a goal" instead of "—")

---

## Summary Statistics

### Issues by Category

| Category | High | Medium | Low | Total |
|----------|------|--------|-----|-------|
| Loading States | 1 | 2 | 1 | 4 |
| Empty States | 0 | 4 | 1 | 5 |
| Error States | 2 | 1 | 1 | 4 |
| Buttons & Inputs | 1 | 2 | 1 | 4 |
| Typography & Spacing | 0 | 3 | 2 | 5 |
| Color Consistency | 1 | 2 | 1 | 4 |
| Navigation & Layout | 1 | 0 | 2 | 3 |
| Animations | 0 | 0 | 2 | 2 |
| Mobile Issues | 0 | 3 | 1 | 4 |
| Placeholders | 0 | 0 | 2 | 2 |
| **TOTAL** | **6** | **17** | **14** | **37** |

*Note: Some issues appear in multiple categories*

### Top 10 Highest-Impact Fixes

1. **Fix `/coach/sessions/page.tsx` hardcoded colors** (HIGH)
   - Replace all `backgroundColor: '#...'` with theme variables
   - Affects: Dark mode, theme consistency
   - Impact: Entire page breaks theme system

2. **Add error states to pages that fail silently** (HIGH)
   - Add error handling to `/coach/clients/[id]/page.tsx`
   - Add error handling to `/client/train/page.tsx`
   - Impact: Users see broken pages with no feedback

3. **Create shared `LoadingSkeleton` component** (MEDIUM)
   - Standardize loading states across all pages
   - Impact: Consistent UX, easier maintenance

4. **Create shared `EmptyState` component** (MEDIUM)
   - Standardize empty states with consistent styling
   - Impact: Consistent UX, better guidance for users

5. **Standardize button system** (MEDIUM)
   - Remove `fc-btn` classes, use `<Button>` component everywhere
   - Impact: Consistent button styling, easier maintenance

6. **Fix input height inconsistencies** (MEDIUM)
   - Standardize to `h-11` (44px) minimum for touch targets
   - Impact: Better mobile UX, accessibility

7. **Standardize bottom padding** (MEDIUM)
   - Use `pb-32` consistently for bottom nav clearance
   - Impact: No content hidden behind nav

8. **Standardize heading sizes** (MEDIUM)
   - H1: `text-3xl`, H2: `text-2xl`, H3: `text-xl`
   - Impact: Clear visual hierarchy

9. **Add empty states to all list pages** (MEDIUM)
   - Add helpful empty states to `/coach/programs`, `/coach/workouts/templates`
   - Impact: Better UX, user guidance

10. **Increase touch target sizes** (MEDIUM)
    - Ensure all buttons/inputs are minimum 44px height
    - Impact: Better mobile accessibility

### Recommended Fix Order

**Phase 1: Critical Fixes (High Impact)**
1. Fix `/coach/sessions/page.tsx` hardcoded colors
2. Add error states to silent-failure pages
3. Fix input/button touch target sizes

**Phase 2: Consistency Improvements (Medium Impact)**
4. Create shared `LoadingSkeleton` component
5. Create shared `EmptyState` component
6. Standardize button system
7. Standardize bottom padding
8. Standardize heading sizes

**Phase 3: Polish (Low Impact)**
9. Add tooltips to disabled buttons
10. Add fade-in animations for dynamic content

---

## Conclusion

The app has **good overall consistency** with theme variables and component usage, but there are **critical issues** in `/coach/sessions/page.tsx` that break the theme system. Most other issues are **medium-priority consistency improvements** that would enhance UX but don't break functionality.

**Key Strengths:**
- ✅ Consistent theme variable usage (most pages)
- ✅ Good empty state patterns (most pages)
- ✅ Consistent error handling with retry (most pages)
- ✅ Consistent bottom navigation

**Key Weaknesses:**
- ❌ `/coach/sessions/page.tsx` uses hardcoded colors (breaks theme)
- ❌ Some pages fail silently (no error states)
- ❌ Inconsistent loading states (no shared component)
- ❌ Touch targets too small on mobile

**Priority:** Fix Phase 1 issues first, then proceed with consistency improvements.
