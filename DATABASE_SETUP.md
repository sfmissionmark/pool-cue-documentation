# Database Setup Guide

Your pool cue documentation app is configured to use **Supabase** as the database backend. Follow these steps to set up your database:

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Sign up" and create an account (free tier available)
3. Verify your email address

### Step 2: Create New Project
1. Click "New Project"
2. Choose your organization (or create one)
3. Enter project details:
   - **Name**: `pool-cue-docs` (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait 2-3 minutes for project creation

### Step 3: Get Database Credentials
1. In your project dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (the `public` key, not service role)

### Step 4: Configure Environment Variables
1. Open your project folder
2. Edit the `.env.local` file
3. Replace the placeholder values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-actual-supabase-url-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-supabase-anon-key-here
   ```

### Step 5: Create Database Table
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste this SQL:

```sql
CREATE TABLE ferrule_specs (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  diameter VARCHAR(100),
  length VARCHAR(100),
  material VARCHAR(255),
  build_style VARCHAR(255),
  machining_steps JSONB DEFAULT '[]'::jsonb,
  assembly_notes TEXT,
  vault_plate BOOLEAN DEFAULT FALSE,
  vault_plate_material VARCHAR(255),
  vault_plate_thickness VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE ferrule_specs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on ferrule_specs" ON ferrule_specs
  FOR ALL USING (true);
```

4. Click "Run"

### Step 6: Test Your App
1. Start your development server: `npm run dev`
2. Go to http://localhost:3000/components/ferrules
3. Try adding a ferrule specification
4. If it saves successfully, you're all set! 🎉

## 🔧 Troubleshooting

### "Failed to save ferrule"
- Check your `.env.local` file has correct URL and key
- Verify the database table was created successfully
- Check browser console for detailed error messages

### "Database connection error"
- Ensure your Supabase project is active (not paused)
- Verify your internet connection
- Check if you copied the correct anon key (not service role key)

### Environment variables not working
- Restart your development server after changing `.env.local`
- Make sure `.env.local` is in your project root directory
- Ensure no extra spaces around the `=` signs

## 🚀 Deployment

When you deploy to Vercel:
1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add the same two environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Redeploy your project

Your database will work the same in production!

## 🎯 Next Steps

Once your database is working:
- Your data is automatically backed up by Supabase
- You can view/edit data directly in the Supabase dashboard
- Your app works both locally and in production
- Data syncs across all your devices

Need help? The error messages in your browser console will guide you! 🛠️