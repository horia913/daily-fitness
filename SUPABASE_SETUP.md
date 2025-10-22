# Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Choose your organization
5. Enter project name: "dailyfitness"
6. Enter a strong database password
7. Choose a region close to you
8. Click "Create new project"

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to Settings → API
2. Copy the "Project URL"
3. Copy the "anon public" key

## Step 3: Create Environment File

Create a file named `.env.local` in your project root with:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 4: Database Schema

We'll create the database tables in the next steps. For now, the basic setup is complete.

## Security Note

Never commit your `.env.local` file to version control. It's already in `.gitignore`.
