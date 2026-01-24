-- Migration: Create centumbob_users table for authentication
-- Execute this in Supabase Dashboard > SQL Editor

-- Create centumbob_users table
CREATE TABLE IF NOT EXISTS public.centumbob_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  email TEXT UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
  CONSTRAINT nickname_length CHECK (char_length(nickname) >= 2 AND char_length(nickname) <= 30)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_centumbob_users_username ON public.centumbob_users(username);
CREATE INDEX IF NOT EXISTS idx_centumbob_users_email ON public.centumbob_users(email) WHERE email IS NOT NULL;

-- Enable RLS
ALTER TABLE public.centumbob_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.centumbob_users;
CREATE POLICY "Users can view own profile"
  ON public.centumbob_users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.centumbob_users;
CREATE POLICY "Users can update own profile"
  ON public.centumbob_users FOR UPDATE
  USING (auth.uid() = id);

-- Allow service role to insert during signup
DROP POLICY IF EXISTS "Service role can insert users" ON public.centumbob_users;
CREATE POLICY "Service role can insert users"
  ON public.centumbob_users FOR INSERT
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.centumbob_users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.centumbob_users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Verify table creation
SELECT 'centumbob_users table created successfully!' AS status;
