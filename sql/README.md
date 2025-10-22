# DailyFitness Database Setup

This directory contains the consolidated SQL files for setting up the DailyFitness database. The files are organized in a logical order and should be run in sequence.

## 📁 File Structure

### Core Setup Files

- **`01-core-setup.sql`** - Essential database structure (profiles, auth, invite codes, client-coach relationships)
- **`02-workouts.sql`** - Complete workout system (exercises, templates, assignments, sessions)
- **`03-meal-plans.sql`** - Meal planning and nutrition tracking system
- **`04-storage.sql`** - File storage setup for avatars and other uploads
- **`05-additional-features.sql`** - Additional features (achievements, progress tracking, messaging)
- **`06-workout-programs.sql`** - Workout programs system (multi-week programs)
- **`07-clipcards.sql`** - ClipCards system (session packages and client ClipCards)

## 🚀 Setup Instructions

### 1. Run Core Setup First

```sql
-- Run in Supabase SQL Editor
\i sql/01-core-setup.sql
```

### 2. Add Workout System

```sql
-- Run in Supabase SQL Editor
\i sql/02-workouts.sql
```

### 3. Add Meal Planning

```sql
-- Run in Supabase SQL Editor
\i sql/03-meal-plans.sql
```

### 4. Setup File Storage

```sql
-- Run in Supabase SQL Editor
\i sql/04-storage.sql
```

**Important**: For storage setup, you also need to:

1. Go to Supabase Dashboard > Storage
2. Create a new bucket named `avatars` (public)
3. Go to Storage > Policies and create the policies listed in the comments

### 5. Add Additional Features

```sql
-- Run in Supabase SQL Editor
\i sql/05-additional-features.sql
```

### 6. Add Workout Programs

```sql
-- Run in Supabase SQL Editor
\i sql/06-workout-programs.sql
```

### 7. Add ClipCards System

```sql
-- Run in Supabase SQL Editor
\i sql/07-clipcards.sql
```

## 🔧 What Each File Contains

### 01-core-setup.sql

- **Profiles table** with user information and roles
- **Invite codes system** for coach-client connections
- **Client-coach relationships** table
- **Authentication triggers** for automatic profile creation
- **RLS policies** for data security

### 02-workouts.sql

- **Exercise categories** and exercises library
- **Workout templates** for coaches to create
- **Workout assignments** to assign templates to clients
- **Session scheduling** system
- **Complete RLS policies** for workout data access

### 03-meal-plans.sql

- **Food database** with nutritional information
- **Meal plan creation** and management
- **Meal plan assignments** to clients
- **Nutrition logging** for tracking daily intake
- **RLS policies** for meal plan data access

### 04-storage.sql

- **Storage bucket setup** (requires Dashboard configuration)
- **Avatar upload functions** for profile pictures
- **File management utilities**
- **Storage policies** (requires Dashboard setup)

### 05-additional-features.sql

- **Achievements system** for client motivation
- **Progress tracking** (body measurements, workout logs)
- **Messaging system** for coach-client communication
- **RLS policies** for all additional features

### 06-workout-programs.sql

- **Workout programs** for multi-week training plans
- **Program weeks** and workout assignments
- **Program assignments** to clients
- **RLS policies** for program data access

### 07-clipcards.sql

- **ClipCard types** for session packages
- **Individual ClipCards** for clients
- **Session tracking** and validity management
- **Helper functions** for ClipCard operations
- **RLS policies** for ClipCard data access

## 🔒 Security Features

All tables include **Row Level Security (RLS)** with appropriate policies:

- **Coaches** can manage their own data and their clients' data
- **Clients** can manage their own data and read assigned content
- **Public data** (exercises, foods) is readable by all authenticated users
- **Sensitive data** is protected with user-specific access controls

## 📊 Performance Optimizations

Each file includes:

- **Indexes** on frequently queried columns
- **Foreign key constraints** for data integrity
- **Check constraints** for data validation
- **Optimized queries** for better performance

## 🧹 Cleanup

The old SQL files in the root directory can be safely deleted after running these consolidated files. The new structure is:

- **More organized** with logical grouping
- **Better documented** with clear comments
- **More maintainable** with consistent patterns
- **More secure** with comprehensive RLS policies

## ⚠️ Important Notes

1. **Run files in order** - dependencies exist between files
2. **Storage setup** requires both SQL and Dashboard configuration
3. **RLS policies** are comprehensive but may need adjustment based on specific requirements
4. **Indexes** are optimized for common query patterns
5. **All tables** use UUID primary keys for better scalability

## 🆘 Troubleshooting

If you encounter issues:

1. Check that all previous files ran successfully
2. Verify RLS policies are working correctly
3. Ensure storage bucket is created in Dashboard
4. Check that auth triggers are functioning
5. Verify foreign key relationships are intact

## 📈 Future Enhancements

The database structure supports:

- **Scalability** with proper indexing
- **Extensibility** with modular design
- **Security** with comprehensive RLS
- **Performance** with optimized queries
- **Maintainability** with clear organization
