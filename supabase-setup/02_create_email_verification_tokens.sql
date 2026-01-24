-- Migration: Create email verification tokens table
-- Execute this in Supabase Dashboard > SQL Editor AFTER running 01_create_centumbob_users.sql

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS public.centumbob_email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT token_length CHECK (char_length(token) = 6),
  CONSTRAINT token_format CHECK (token ~ '^[0-9]{6}$')
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_centumbob_email_verification_user_email
  ON public.centumbob_email_verification_tokens(user_id, email);

CREATE INDEX IF NOT EXISTS idx_centumbob_email_verification_expires
  ON public.centumbob_email_verification_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.centumbob_email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own tokens
DROP POLICY IF EXISTS "Users can view own tokens" ON public.centumbob_email_verification_tokens;
CREATE POLICY "Users can view own tokens"
  ON public.centumbob_email_verification_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all tokens (Edge Function uses service role)
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.centumbob_email_verification_tokens;
CREATE POLICY "Service role can manage tokens"
  ON public.centumbob_email_verification_tokens FOR ALL
  WITH CHECK (true);

-- Cleanup function for expired tokens (should be run daily via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.centumbob_email_verification_tokens
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Verify table creation
SELECT 'centumbob_email_verification_tokens table created successfully!' AS status;
