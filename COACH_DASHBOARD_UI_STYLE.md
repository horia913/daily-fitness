# Coach Dashboard UI Style Reference (Dark Mode)

This document describes the UI styling used in the coach dashboard (`/coach/page.tsx`), which serves as the reference style for all workout-related pages.

## Card Component: GlassCard

The coach dashboard uses the `GlassCard` component from `@/components/ui/GlassCard`.

### Dark Mode Card Style

**Background:**
- `rgba(28, 28, 30, 0.80)` - 80% opacity dark background (NOT highly transparent)

**Backdrop Filter:**
- `blur(20px) saturate(150%)`
- `WebkitBackdropFilter: blur(20px) saturate(150%)`

**Border:**
- `1px solid rgba(255, 255, 255, 0.08)` - Very subtle white border

**Border Radius:**
- `1rem` (16px) - Rounded corners

**Box Shadow (by elevation):**
- Elevation 1: `0px 2px 8px rgba(0,0,0,0.4)`
- Elevation 2: `0px 4px 16px rgba(0,0,0,0.6)` (most common)
- Elevation 3: `0px 8px 24px rgba(0,0,0,0.7)`
- Elevation 4: `0px 16px 48px rgba(0,0,0,0.8)`

**Transition:**
- `all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)`

**Key Characteristics:**
- **NOT highly transparent** - Uses 80% opacity solid dark background
- Subtle glass effect with backdrop blur
- Strong shadows for depth (especially elevation 2)
- Rounded corners (16px)
- Smooth transitions

## Text Colors (Dark Mode)

**Primary Text:**
- `#fff` (white) - For headings and important text

**Secondary Text:**
- `rgba(255,255,255,0.7)` - For labels and secondary information
- `rgba(255,255,255,0.6)` - For descriptions and less important text

## Usage in Coach Dashboard

The coach dashboard uses:
- `<GlassCard elevation={2} className="p-6">` for most cards
- `<GlassCard elevation={1} className="p-6">` for header cards
- Standard padding: `p-6` (24px)

## Implementation Strategy

Instead of creating custom inline styles, **simply use the GlassCard component** that already exists. This ensures consistency and simplicity.

**Replace Card components with GlassCard:**
```tsx
// Before:
import { Card, CardContent, CardHeader } from "@/components/ui/card";
<Card>
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>

// After:
import { GlassCard } from "@/components/ui/GlassCard";
<GlassCard elevation={2} className="p-6">
  {/* Content directly here */}
</GlassCard>
```

**Note:** GlassCard doesn't have CardHeader/CardContent sub-components - content goes directly inside with appropriate padding/styling.
