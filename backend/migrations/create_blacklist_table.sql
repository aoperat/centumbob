-- Create chat blacklist table for managing blocked users
-- This allows administrators to block users by IP address or anonymous ID

CREATE TABLE IF NOT EXISTS centumbob_chat_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(45),  -- IPv4 or IPv6
  anonymous_id VARCHAR(255),  -- Anonymous user ID
  user_id UUID,  -- Authenticated user ID (if applicable)
  reason TEXT NOT NULL,  -- Reason for blocking
  blocked_by VARCHAR(255),  -- Admin who blocked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,  -- Optional expiration (NULL = permanent)
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,  -- Additional notes
  CONSTRAINT at_least_one_identifier CHECK (
    ip_address IS NOT NULL OR
    anonymous_id IS NOT NULL OR
    user_id IS NOT NULL
  )
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_blacklist_ip ON centumbob_chat_blacklist(ip_address) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_blacklist_anonymous_id ON centumbob_chat_blacklist(anonymous_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_blacklist_user_id ON centumbob_chat_blacklist(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_blacklist_created_at ON centumbob_chat_blacklist(created_at DESC);

-- Add comments
COMMENT ON TABLE centumbob_chat_blacklist IS 'Blacklist for managing blocked users in chat';
COMMENT ON COLUMN centumbob_chat_blacklist.ip_address IS 'IP address to block (IPv4 or IPv6)';
COMMENT ON COLUMN centumbob_chat_blacklist.anonymous_id IS 'Anonymous user ID to block';
COMMENT ON COLUMN centumbob_chat_blacklist.user_id IS 'Authenticated user ID to block';
COMMENT ON COLUMN centumbob_chat_blacklist.expires_at IS 'Expiration time (NULL = permanent block)';
COMMENT ON COLUMN centumbob_chat_blacklist.is_active IS 'Whether the block is currently active';
