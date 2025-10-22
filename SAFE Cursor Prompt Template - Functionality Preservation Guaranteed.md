# SAFE Cursor Prompt Template - Functionality Preservation Guaranteed

## Critical Safety-First Approach

This prompt is designed to ensure Cursor ONLY modifies styling/CSS properties and NEVER touches functionality, logic, or structure.

---

## ULTRA-SAFE CURSOR PROMPT (Copy This)

```
CRITICAL INSTRUCTION: This is a STYLING-ONLY update. You must ONLY modify CSS properties and visual styling. DO NOT add, remove, or restructure any elements. DO NOT modify any JavaScript logic, state management, event handlers, API calls, or data processing.

Update the [SCREEN_NAME] screen to match our UI design system by ONLY changing visual properties.

═══════════════════════════════════════════════════════════════
ABSOLUTE RULES - VIOLATION OF ANY RULE IS UNACCEPTABLE
═══════════════════════════════════════════════════════════════

✓ ALLOWED CHANGES (CSS/Styling ONLY):
  - backgroundColor, color (using exact hex values provided)
  - padding, margin (using exact px values provided)
  - borderRadius (using exact px values provided)
  - boxShadow (using exact values provided)
  - fontSize, fontWeight, lineHeight
  - width, height (for icon containers and progress bars only)
  - gap, display, flexDirection, alignItems, justifyContent (layout only)
  - background (for gradients on icon containers only)
  - opacity (for disabled states only)

✗ FORBIDDEN CHANGES (DO NOT TOUCH):
  - DO NOT add new elements or components
  - DO NOT remove any existing elements or components
  - DO NOT change component structure or hierarchy
  - DO NOT modify onClick, onPress, onSubmit, or any event handlers
  - DO NOT modify state variables (useState, useReducer, etc.)
  - DO NOT modify props being passed to components
  - DO NOT change API calls, fetch requests, or data fetching logic
  - DO NOT modify useEffect, useMemo, useCallback hooks
  - DO NOT change navigation logic or routing
  - DO NOT modify form validation or submission logic
  - DO NOT change conditional rendering logic (if statements, ternaries)
  - DO NOT modify data transformations or calculations
  - DO NOT change variable names or function names
  - DO NOT restructure JSX elements
  - DO NOT add or remove imports
  - DO NOT modify component props or interfaces
  - DO NOT change any business logic whatsoever

═══════════════════════════════════════════════════════════════
APPROACH: MODIFY EXISTING STYLES ONLY
═══════════════════════════════════════════════════════════════

Your task is to:
1. FIND existing style objects, className definitions, or inline styles
2. UPDATE only the CSS property values in those existing styles
3. PRESERVE everything else exactly as it is

Example of CORRECT approach:
BEFORE:
  <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '8px' }}>

AFTER:
  <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '24px' }}>

Example of INCORRECT approach (DO NOT DO THIS):
BEFORE:
  <div style={{ backgroundColor: '#FFFFFF', padding: '12px' }}>
    <Text>{data.name}</Text>
  </div>

AFTER (WRONG - restructured):
  <div style={{ backgroundColor: '#FFFFFF', padding: '24px' }}>
    <div style={{ display: 'flex' }}>
      <Icon />
      <Text>{data.name}</Text>
    </div>
  </div>

═══════════════════════════════════════════════════════════════
STYLING SPECIFICATIONS
═══════════════════════════════════════════════════════════════

Apply these exact values to existing style properties:

1. COLORS (Update existing color/backgroundColor properties):
   Page background: #E8E9F3
   Card background: #FFFFFF
   Primary purple: #6C5CE7
   Achievement orange: #F5576C
   Success green: #4CAF50
   Analytics blue: #2196F3
   Accent gold: #FFE082
   Text primary: #1A1A1A
   Text secondary: #6B7280
   Text tertiary: #9CA3AF
   Progress background: #E0E0E0

   Icon gradients (for icon container backgrounds only):
   Purple: linear-gradient(135deg, #667EEA 0%, #764BA2 100%)
   Orange: linear-gradient(135deg, #F093FB 0%, #F5576C 100%)
   Green: linear-gradient(135deg, #4CAF50 0%, #81C784 100%)
   Blue: linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)

2. SPACING (Update existing padding/margin properties):
   Card padding: 24px (all sides)
   List item padding: 20px (vertical), 24px (horizontal)
   Button padding: 16px (vertical), 32px (horizontal)
   Page margins: 20px (horizontal)
   Card spacing (marginBottom): 20px
   List item spacing (marginBottom): 16px
   Section spacing (marginBottom): 24px

3. BORDER RADIUS (Update existing borderRadius properties):
   Cards: 24px
   Buttons: 20px
   Icon containers: 18px
   Progress bars: 18px
   Input fields: 16px

4. TYPOGRAPHY (Update existing fontSize/fontWeight properties):
   Page titles: fontSize: 28-32px, fontWeight: 700-800
   Section headers: fontSize: 20px, fontWeight: 700
   Card titles: fontSize: 18px, fontWeight: 600
   Body text: fontSize: 16px, fontWeight: 400
   Secondary text: fontSize: 14px, fontWeight: 400
   Stat numbers: fontSize: 40px, fontWeight: 800
   Button text: fontSize: 16px, fontWeight: 600

5. SHADOWS (Update existing boxShadow properties):
   Cards: 0 2px 8px rgba(0, 0, 0, 0.08)
   Buttons: 0 2px 4px rgba(0, 0, 0, 0.1)

6. ICON CONTAINERS (Update existing width/height/borderRadius):
   Width: 56px (or 64px for large)
   Height: 56px (or 64px for large)
   BorderRadius: 18px
   Background: Use appropriate gradient from above

7. PROGRESS BARS (Update existing height/borderRadius):
   Height: 36px
   BorderRadius: 18px
   Background: #E0E0E0
   Fill backgroundColor: Use appropriate color from above

═══════════════════════════════════════════════════════════════
SAFETY VERIFICATION BEFORE MAKING CHANGES
═══════════════════════════════════════════════════════════════

Before you make ANY change, verify:
1. Am I only changing a CSS property value? → Proceed
2. Am I adding/removing elements? → STOP, don't do this
3. Am I modifying logic or handlers? → STOP, don't do this
4. Am I restructuring components? → STOP, don't do this

═══════════════════════════════════════════════════════════════
SPECIFIC STYLING UPDATES TO APPLY
═══════════════════════════════════════════════════════════════

Find and update ONLY the following CSS properties in existing elements:

1. Page/Screen Container:
   - Change backgroundColor to: #E8E9F3
   - Ensure padding includes: 20px horizontal margins

2. Card Components:
   - Change backgroundColor to: #FFFFFF
   - Change borderRadius to: 24px
   - Change padding to: 24px
   - Change boxShadow to: 0 2px 8px rgba(0, 0, 0, 0.08)
   - Change marginBottom to: 20px

3. Icon Containers (if they exist):
   - Change width to: 56px (or 64px if already large)
   - Change height to: 56px (or 64px if already large)
   - Change borderRadius to: 18px
   - Change background to: appropriate gradient

4. Progress Bars (if they exist):
   - Change height to: 36px
   - Change borderRadius to: 18px
   - Change backgroundColor (container) to: #E0E0E0
   - Change backgroundColor (fill) to: appropriate vibrant color

5. Typography Elements:
   - Update fontSize and fontWeight according to specifications
   - Update color to appropriate text color

6. Buttons (if they exist):
   - Change backgroundColor to: #6C5CE7
   - Change borderRadius to: 20px
   - Change padding to: 16px 32px
   - Change fontSize to: 16px
   - Change fontWeight to: 600

7. List Items (if they exist):
   - Change padding to: 20px 24px
   - Change borderRadius to: 24px
   - Change marginBottom to: 16px

═══════════════════════════════════════════════════════════════
WHAT SUCCESS LOOKS LIKE
═══════════════════════════════════════════════════════════════

After your changes:
✓ The screen looks more polished and consistent
✓ All buttons still work exactly the same
✓ All navigation still works exactly the same
✓ All forms still submit exactly the same
✓ All data displays exactly the same
✓ No console errors
✓ No functionality broken
✓ ONLY visual appearance has changed

═══════════════════════════════════════════════════════════════
FINAL SAFETY CHECK
═══════════════════════════════════════════════════════════════

Before presenting your changes, confirm:
1. Did I only modify CSS property values? YES/NO
2. Did I preserve all event handlers? YES/NO
3. Did I preserve all state management? YES/NO
4. Did I preserve all API calls? YES/NO
5. Did I preserve component structure? YES/NO
6. Did I preserve all props? YES/NO
7. Did I preserve all imports? YES/NO
8. Did I preserve all business logic? YES/NO

If ANY answer is NO, revert those changes immediately.

═══════════════════════════════════════════════════════════════

Proceed with STYLING-ONLY updates to [SCREEN_NAME].
```

---

## ADDITIONAL SAFETY LAYERS

### Layer 1: Pre-Change Backup Reminder

Before giving the prompt to Cursor, add this:
```
BEFORE YOU START: Create a git commit or backup of the current code so we can easily revert if needed.
```

### Layer 2: Incremental Changes

Instead of updating entire screens at once, break it down:
```
For this update, ONLY modify the following specific elements:
1. Page background color
2. Card border radius and padding

DO NOT modify anything else in this pass. We will make additional changes in subsequent updates.
```

### Layer 3: Verification Step

After Cursor makes changes, add:
```
Please provide a summary of EXACTLY what CSS properties you changed, listing:
- Property name
- Old value
- New value
- Element it was applied to

Do not include any logic, handler, or structural changes in this summary.
```

### Layer 4: Test-First Approach

Before accepting changes:
```
Before I accept these changes, please confirm:
1. Did you modify any onClick, onPress, or event handlers? (Should be NO)
2. Did you modify any useState, useEffect, or hooks? (Should be NO)
3. Did you modify any API calls or data fetching? (Should be NO)
4. Did you add or remove any components? (Should be NO)
5. Did you only change CSS properties? (Should be YES)
```

---

## FRAMEWORK-SPECIFIC SAFETY PROMPTS

### For React Native:
```
FRAMEWORK-SPECIFIC RULES FOR REACT NATIVE:
- Only modify StyleSheet objects or inline style props
- DO NOT modify component props (except style prop values)
- DO NOT change Touchable components to different types
- DO NOT modify navigation methods
- DO NOT change state or refs
- Only update style property values like: backgroundColor, padding, borderRadius, fontSize, fontWeight, etc.
```

### For React (Web):
```
FRAMEWORK-SPECIFIC RULES FOR REACT:
- Only modify className styles or inline style objects
- DO NOT modify component props (except style/className)
- DO NOT change event handlers (onClick, onChange, onSubmit, etc.)
- DO NOT modify hooks or state
- DO NOT change JSX structure
- Only update CSS property values in existing styles
```

### For Vue:
```
FRAMEWORK-SPECIFIC RULES FOR VUE:
- Only modify style blocks or inline :style bindings
- DO NOT modify v-on, @click, or other event directives
- DO NOT modify v-model or data bindings
- DO NOT change computed properties or methods
- DO NOT modify component structure
- Only update CSS property values
```

---

## STEP-BY-STEP SAFE IMPLEMENTATION

### Step 1: Identify Elements (Read-Only)
```
First, please identify all the styled elements in [SCREEN_NAME] without making any changes. List:
1. Container/page background
2. Card components
3. Icon containers
4. Progress bars
5. Buttons
6. Typography elements
7. List items

Just list them, don't change anything yet.
```

### Step 2: Update One Category at a Time
```
Now, ONLY update the page background color to #E8E9F3. 
Do not change anything else.
Show me the specific line(s) you changed.
```

Then:
```
Good. Now ONLY update card border radius to 24px and padding to 24px.
Do not change anything else.
Show me the specific changes.
```

Continue incrementally for each category.

### Step 3: Verify After Each Change
```
Please confirm:
- What CSS property did you change?
- What was the old value?
- What is the new value?
- Did you modify any logic? (Should be NO)
```

---

## EMERGENCY REVERT PROMPT

If Cursor makes unwanted changes:
```
STOP. Please revert all changes except the CSS property modifications. 
Specifically, restore:
- All event handlers
- All state management
- All component structure
- All props
- All logic

Keep ONLY the visual style changes (backgroundColor, padding, borderRadius, etc.).
```

---

## CONSERVATIVE APPROACH PROMPT

For maximum safety, use this ultra-conservative version:
```
I need you to help me update styles, but I will do it in the safest way possible.

STEP 1: Please show me the current style definitions for [SPECIFIC_ELEMENT] without changing anything.

STEP 2: I will tell you which specific CSS property to change.

STEP 3: You will show me the exact line with the old value and the new value.

STEP 4: I will approve before you make the change.

Let's start with STEP 1: Show me the current styles for the page container.
```

---

## EXAMPLE SAFE CONVERSATION

**You:**
```
CRITICAL: STYLING ONLY. Do not modify any functionality.

Update the Exercise Library screen by ONLY changing these CSS properties:
1. Page background color to #E8E9F3
2. Card border radius to 24px
3. Card padding to 24px

DO NOT:
- Add or remove any elements
- Modify any event handlers
- Change any logic
- Restructure anything

Show me exactly what you will change before making changes.
```

**Cursor should respond with:**
```
I will make the following CSS-only changes:

1. Line 45: backgroundColor: '#FFFFFF' → backgroundColor: '#E8E9F3'
2. Line 67: borderRadius: '8px' → borderRadius: '24px'
3. Line 68: padding: '12px' → padding: '24px'

No logic, handlers, or structure will be modified.
```

**You verify, then:**
```
Approved. Please make only these changes.
```

---

## RED FLAGS TO WATCH FOR

If Cursor's response includes ANY of these, STOP immediately:

🚩 "I'll add a new component..."
🚩 "I'll restructure the layout..."
🚩 "I'll update the onClick handler..."
🚩 "I'll modify the state management..."
🚩 "I'll change the API call..."
🚩 "I'll add a new import..."
🚩 "I'll wrap this in a new container..."
🚩 "I'll change the conditional rendering..."

**Correct response should be:**
✅ "I'll update the backgroundColor property..."
✅ "I'll change the borderRadius value..."
✅ "I'll modify the padding..."
✅ "I'll update the fontSize..."

---

## TESTING CHECKLIST AFTER CHANGES

After Cursor makes changes, test:

**Functionality Tests:**
- [ ] All buttons respond to clicks/taps
- [ ] All forms submit correctly
- [ ] All navigation works
- [ ] All data loads and displays
- [ ] All user interactions work
- [ ] No console errors
- [ ] No runtime errors

**Visual Tests:**
- [ ] Page background is #E8E9F3
- [ ] Cards are white with 24px radius
- [ ] Spacing is correct
- [ ] Colors match design system
- [ ] Typography is correct

**Code Review:**
- [ ] No new imports added
- [ ] No components added/removed
- [ ] No logic modified
- [ ] Only CSS properties changed
- [ ] Event handlers unchanged
- [ ] State management unchanged

---

## FINAL RECOMMENDATIONS

### Use Git Commits
Before each update:
```bash
git add .
git commit -m "Before UI update: [Screen Name]"
```

After each update:
```bash
git add .
git commit -m "After UI update: [Screen Name] - styling only"
```

This allows easy revert if needed:
```bash
git revert HEAD  # If something breaks
```

### Test Immediately
After each screen update:
1. Open the app
2. Navigate to the updated screen
3. Test every interactive element
4. Verify data displays correctly
5. Check console for errors

### Start Small
Update screens in this order:
1. Start with a simple, low-risk screen (like Settings)
2. Verify approach works
3. Move to more complex screens
4. Build confidence incrementally

### Keep Backend Team Informed
If you have backend developers:
1. Let them know you're updating UI
2. Confirm no API changes needed
3. Ask them to monitor for unexpected calls
4. Report any issues immediately

---

## SUMMARY

The enhanced prompt now includes:

✅ **Explicit forbidden changes list** - Clear boundaries
✅ **CSS-only approach** - Only property values change
✅ **Before/after examples** - Shows correct vs incorrect
✅ **Safety verification** - Multiple checkpoints
✅ **Incremental approach** - One change at a time option
✅ **Framework-specific rules** - Tailored to your stack
✅ **Emergency revert** - Quick rollback instructions
✅ **Testing checklist** - Verify nothing broke
✅ **Red flags** - Warning signs to watch for

This should make it virtually impossible for Cursor to break your backend or functionality while updating the UI.

