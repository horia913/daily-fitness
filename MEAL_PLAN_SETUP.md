# Meal Plan System Setup

## Overview

The client nutrition page has been completely redesigned to focus on meal plan completion with photo verification. Manual food logging is now a secondary feature.

## Key Features

### 🎯 **Meal Plan Focus**

- **Primary Tab**: Shows assigned meal plan with individual meals
- **Photo Verification**: Clients must upload photos to complete meals
- **Progress Tracking**: Visual indicators for completed vs incomplete meals
- **Daily Targets**: Displays macro targets from assigned meal plan

### 📱 **Photo Upload System**

- **Required Photos**: Clients must upload meal photos to mark as complete
- **Storage**: Photos stored in Supabase Storage (`meal-photos` bucket)
- **Visual Feedback**: Completed meals show green checkmarks and photo thumbnails
- **Upload Progress**: Loading states during photo upload

### 🔄 **Manual Logging (Secondary)**

- **Secondary Tab**: Available for clients without meal plans
- **Food Search**: Search and add individual foods
- **Meal Types**: Breakfast, lunch, dinner, snack categorization
- **Nutrition Tracking**: Calculate macros for logged foods

## Database Setup

### 1. Run the SQL Script

```sql
-- Execute the meal plan system schema
\i database-meal-plan-system.sql
```

### 2. Create Storage Bucket

In Supabase Dashboard > Storage:

- **Bucket Name**: `meal-photos`
- **Public**: `true`
- **File Size Limit**: `10MB`
- **Allowed MIME Types**: `image/*`

### 3. Sample Data

The script includes sample meal plan data for testing:

- Sample meal plan with 5 meals (breakfast, snacks, lunch, dinner)
- Proper meal ordering and categorization

## How It Works

### For Clients:

1. **View Assigned Meal Plan**: See daily macro targets and meal list
2. **Complete Meals**: Upload photos to mark meals as complete
3. **Track Progress**: Visual indicators show completion status
4. **Manual Logging**: Use secondary tab for additional food tracking

### For Coaches:

1. **Assign Meal Plans**: Use coach dashboard to assign meal plans to clients
2. **Monitor Progress**: View client meal completion status
3. **Photo Verification**: See uploaded meal photos for accountability

## File Structure

```
dailyfitness-app/
├── src/app/client/nutrition/page.tsx          # Main client nutrition page
├── database-meal-plan-system.sql              # Database schema
└── MEAL_PLAN_SETUP.md                        # This setup guide
```

## Testing

### 1. Assign a Meal Plan

- Go to coach dashboard > meals
- Click "Assign Meal Plan"
- Select client and meal plan
- Set start/end dates

### 2. Test Client Experience

- Login as client
- Go to nutrition page
- See assigned meal plan
- Upload photos to complete meals
- Check completion status

### 3. Verify Data

- Check `meal_completions` table for completion records
- Verify photos in Supabase Storage
- Confirm RLS policies are working

## Key Components

### Meal Plan Display

- Shows meal plan name and macro targets
- Lists individual meals with completion status
- Color-coded meal types (breakfast=orange, lunch=green, etc.)

### Photo Upload

- Hidden file input triggered by button
- Upload to Supabase Storage with organized folder structure
- Progress indicators during upload
- Error handling for failed uploads

### Completion Tracking

- `meal_completions` table stores completion records
- Links meals to clients with timestamps
- Stores photo URLs for verification
- RLS policies ensure data security

## Next Steps

1. **Run Database Script**: Execute `database-meal-plan-system.sql`
2. **Create Storage Bucket**: Set up `meal-photos` bucket in Supabase
3. **Test Assignment**: Assign meal plan to client from coach dashboard
4. **Test Completion**: Login as client and complete meals with photos
5. **Verify Data**: Check database and storage for proper data flow

The system is now ready for meal plan-based nutrition tracking with photo verification! 🎉
