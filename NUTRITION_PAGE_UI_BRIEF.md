# Nutrition Page UI Brief
## Client Nutrition Tracking & Meal Photo Upload

---

## Overview

The Nutrition page allows clients to view their assigned meal plan, track daily nutrition intake, and upload accountability photos for each meal. The page displays all meals from the active meal plan and allows clients to upload one photo per meal per day.

---

## Core Business Rules

### Meal Photo Upload Rules
1. **1 Photo Per Meal Per Day**: Clients can upload exactly ONE photo per meal per day
   - Each meal (breakfast, lunch, dinner, snack) can have its own photo
   - A client can upload photos for multiple meals on the same day
   - Example: Client can upload breakfast photo, lunch photo, dinner photo, and snack photo all on the same day
   
2. **No Replacement**: Once a photo is uploaded for a meal, it cannot be replaced or deleted by the client
   - Photos are for accountability tracking only
   - Coaches can delete/update photos for administrative purposes

3. **Per Meal, Not Per Day**: The constraint is per meal, not per day
   - A meal plan typically has 3-4 meals (breakfast, lunch, dinner, snack)
   - Each meal can have its own photo independently

---

## Page Layout & Structure

### Header Section
- **Title**: "Nutrition Tracking"
- **Date**: Current date (e.g., "Monday, January 15")
- **Action Button**: "Log Food" (links to `/client/nutrition/log`)

### Smart Insights Card (Conditional)
- **Visibility**: Only shown when there's an active meal plan
- **Content**: Nutrition insights based on progress
  - Calorie tracking insights
  - Protein intake recommendations
  - Hydration reminders
- **Styling**: Warning/success/info variants with icons

### Nutrition Summary Cards (Conditional)
- **Visibility**: Only shown when there's an active meal plan
- **Calorie Ring**: Circular progress indicator showing calories consumed vs goal
- **Macros Bars**: Protein, Carbs, Fat progress bars with "Adjust Goals" link

### Meals Section (Main Content)
- **Title**: "Today's Meals"
- **Subtitle**: "X of Y meals logged • Upload 1 photo per meal per day"
- **Layout**: Grid (1 column on mobile, 2 columns on tablet+)
- **Empty States**:
  - No active plan: "No active meal plan assigned. Contact your coach to set one up."
  - Plan with no meals: "Your active meal plan has no meals configured yet."

### Water Tracker Section
- **Component**: WaterTracker with glass count
- **Position**: After meals section

---

## Meal Card Design

Each meal card displays:

### Header
- **Emoji Icon**: Meal type emoji (🍳 breakfast, 🥗 lunch, 🍽️ dinner, 🍎 snack)
- **Meal Name**: Name of the meal from meal plan
- **Calorie Count** (if logged): Total calories for the meal

### Photo Display
- **Condition**: If photo exists, show thumbnail
- **Size**: Full width, height 128px (h-32)
- **Style**: Rounded corners, object-cover

### Food Items List (if meal has items)
- **Display**: List of food items with:
  - Food name
  - Quantity and serving unit
  - Calories per item
  - Macros (P/C/F) per item
- **Total Row**: Sum of calories, protein, carbs, fat for the meal

### Status Section

#### If Meal Photo is Logged:
- **Status Badge**: Green badge with checkmark icon
  - Text: "{Meal Name} Photo Logged"
  - Background: Success color (rgba(16,185,129,0.2))
- **Timestamp**: "Uploaded [time]" (e.g., "Uploaded 2:30 PM")
- **Helper Text**: "You can upload photos for other meals separately"
  - Small, muted text
  - Clarifies that other meals can still be uploaded

#### If Meal Photo is NOT Logged:
- **Upload Button**: Full-width button
  - Icon: Camera icon
  - Text: "Upload {Meal Name} Photo"
  - Color: Success gradient
  - State: Disabled when uploading (shows spinner)

### States
- **Loading**: Skeleton/spinner while fetching meal data
- **Empty**: "No food logged yet" message
- **Photo Only**: "Meal photo uploaded - awaiting analysis" (if photo exists but no food items)

---

## User Interactions

### Upload Photo Flow
1. User clicks "Upload {Meal Name} Photo" button
2. File picker opens (camera on mobile)
3. User selects/takes photo
4. Button shows "Uploading..." with spinner
5. Photo uploads to Supabase storage
6. Database log created in `meal_photo_logs`
7. Success message: "Meal photo uploaded successfully!"
8. Meal card updates to show:
   - Photo thumbnail
   - "Logged" status badge
   - Upload timestamp

### Error Handling
- **Already Uploaded**: "Photo already uploaded for {Meal Name} today. Each meal can have one photo per day."
- **Upload Failed**: "Failed to upload photo. Please try again."
- **Network Error**: "Network error. Please check your connection and try again."

---

## Visual Design Requirements

### Color Scheme
- **Success/Logged**: Green (#10B981)
- **Primary Actions**: Success gradient
- **Text**: Theme-aware (dark/light mode)
- **Borders**: Subtle, theme-aware

### Typography
- **Title**: 2xl, bold
- **Meal Name**: Semibold
- **Helper Text**: xs, muted
- **Status Text**: sm, medium weight

### Spacing
- **Card Padding**: p-4 (16px)
- **Grid Gap**: gap-4 (16px)
- **Section Margin**: mb-6 (24px)

### Icons
- Camera icon for upload buttons
- CheckCircle icon for logged status
- Meal type emojis for visual identification

---

## Data Flow

### Loading Sequence
1. Check for active meal plan assignment
2. Fetch all meals in the active plan
3. For each meal:
   - Fetch meal food items
   - Calculate nutrition totals
   - Check for today's photo log
   - Check for today's completion (backward compatibility)
4. Aggregate totals for summary cards
5. Display all meals in grid

### State Management
- `meals`: Array of meal objects with photo status
- `uploadingMeal`: ID of meal currently uploading (null when none)
- `hasActivePlan`: Boolean indicating if client has active plan
- `hasMealsInPlan`: Boolean indicating if plan has meals
- `nutritionData`: Aggregated nutrition totals

---

## Key UI Messages

### Header
- "X of Y meals logged • Upload 1 photo per meal per day"

### Button States
- **Default**: "Upload {Meal Name} Photo"
- **Uploading**: "Uploading..." (with spinner)
- **Logged**: "{Meal Name} Photo Logged" (badge)

### Error Messages
- "Photo already uploaded for {Meal Name} today. Each meal can have one photo per day."
- "You can upload photos for other meals separately"

### Empty States
- "No food logged yet" (when meal has no items and no photo)
- "Meal photo uploaded - awaiting analysis" (when photo exists but no food items)

---

## Technical Constraints

### Database
- Table: `meal_photo_logs`
- Unique Constraint: `(client_id, meal_id, log_date)`
- Storage: Supabase Storage bucket `meal-photos`
- Path Format: `{client_id}/{meal_id}/{timestamp}_{filename}`

### File Validation
- Max Size: 5MB
- Allowed Types: JPEG, JPG, PNG, WebP
- Mobile: Camera capture enabled

### RLS Policies
- Clients: INSERT and SELECT only (no UPDATE/DELETE)
- Coaches: Full access (SELECT, UPDATE, DELETE)

---

## User Experience Goals

1. **Clarity**: Make it obvious that each meal can have its own photo
2. **Progress**: Show how many meals have been logged
3. **Feedback**: Clear success/error messages
4. **Accessibility**: Large touch targets, clear labels
5. **Efficiency**: Quick photo capture and upload

---

## Mockup Requirements

### Must Show
1. Multiple meal cards (at least 3-4 meals)
2. Different states:
   - Meal with photo logged
   - Meal without photo (upload button visible)
   - Meal currently uploading
3. Progress indicator in header
4. Photo thumbnails when logged
5. Clear visual distinction between logged and unlogged meals

### Visual Hierarchy
1. Header with progress
2. Meal cards in grid
3. Each meal card clearly shows its state
4. Upload buttons are prominent and accessible

### Responsive Design
- Mobile: Single column meal cards
- Tablet+: 2-column grid
- Desktop: 2-column grid (max-width container)

---

## Example Scenarios

### Scenario 1: New Day, No Photos
- All meals show "Upload {Meal Name} Photo" buttons
- Header shows "0 of 4 meals logged"
- All buttons are enabled

### Scenario 2: Partial Progress
- Breakfast: Photo logged (green badge, thumbnail visible)
- Lunch: Upload button visible
- Dinner: Upload button visible
- Snack: Upload button visible
- Header shows "1 of 4 meals logged"

### Scenario 3: All Meals Logged
- All meals show green "Logged" badges
- All photos visible as thumbnails
- Header shows "4 of 4 meals logged"
- Helper text: "You can upload photos for other meals separately"

---

## Edge Cases

1. **No Active Plan**: Show "Set Nutrition Goals" card instead of meals
2. **Plan with No Meals**: Show empty state message
3. **Upload Failure**: Show error, keep button enabled for retry
4. **Network Offline**: Show error, allow retry when online
5. **Multiple Meals Same Type**: Each meal has unique ID, can all have photos

---

## Success Criteria

✅ User can see all meals from their active plan
✅ Each meal has its own upload button
✅ Progress indicator shows X of Y meals logged
✅ Clear messaging: "1 photo per meal per day"
✅ Photo thumbnails display when logged
✅ Status badges clearly show logged state
✅ Error messages are specific and helpful
✅ Mobile-friendly camera capture
✅ Visual feedback during upload

---

## Notes for UI Designer

- The constraint is **per meal**, not per day
- A typical meal plan has 3-4 meals
- Users should be able to upload photos for breakfast, lunch, dinner, and snacks independently
- The UI must make it clear that uploading a photo for one meal does not prevent uploading photos for other meals
- Use visual indicators (badges, icons, colors) to show which meals have been logged
- Progress indicator helps users understand how many meals they've completed

