-- Migration: Add centumbob_ad_inquiries table and is_read field to complaints
-- Created: 2026-01-25

-- Step 1: Rename existing complaints table to centumbob_complaints if it exists
DO $$
BEGIN
  -- Check if complaints table exists and centumbob_complaints doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'complaints'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'centumbob_complaints'
  ) THEN
    ALTER TABLE complaints RENAME TO centumbob_complaints;
    RAISE NOTICE 'Renamed complaints to centumbob_complaints';
  END IF;
END $$;

-- Step 2: Create centumbob_complaints table if it doesn't exist
CREATE TABLE IF NOT EXISTS centumbob_complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_name TEXT NOT NULL,
  date_range TEXT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'resolved', 'closed')),
  admin_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Add is_read column to centumbob_complaints table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centumbob_complaints' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE centumbob_complaints ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE 'Added is_read column to centumbob_complaints';
  END IF;
END $$;

-- Step 4: Create index for centumbob_complaints is_read
CREATE INDEX IF NOT EXISTS idx_centumbob_complaints_is_read ON centumbob_complaints(is_read);

-- Step 5: Create centumbob_ad_inquiries table
CREATE TABLE IF NOT EXISTS centumbob_ad_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('배너', '협찬', '팝업', '기타')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'resolved', 'closed')),
  admin_response TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 6: Create indexes for centumbob_ad_inquiries
CREATE INDEX IF NOT EXISTS idx_centumbob_ad_inquiries_status ON centumbob_ad_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_centumbob_ad_inquiries_email ON centumbob_ad_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_centumbob_ad_inquiries_is_read ON centumbob_ad_inquiries(is_read);
CREATE INDEX IF NOT EXISTS idx_centumbob_ad_inquiries_created_at ON centumbob_ad_inquiries(created_at DESC);

-- Step 7: Enable Row Level Security on centumbob_ad_inquiries
ALTER TABLE centumbob_ad_inquiries ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop existing policies if they exist (to avoid duplicates)
DROP POLICY IF EXISTS "Anyone can submit ad inquiries" ON centumbob_ad_inquiries;
DROP POLICY IF EXISTS "Users can read their own ad inquiries" ON centumbob_ad_inquiries;
DROP POLICY IF EXISTS "Authenticated users can update ad inquiries" ON centumbob_ad_inquiries;

-- Step 9: Create RLS policies for centumbob_ad_inquiries
-- Allow public to insert (submit inquiries)
CREATE POLICY "Anyone can submit ad inquiries"
  ON centumbob_ad_inquiries
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public to read their own inquiries by email
CREATE POLICY "Users can read their own ad inquiries"
  ON centumbob_ad_inquiries
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users (admins) to update
CREATE POLICY "Authenticated users can update ad inquiries"
  ON centumbob_ad_inquiries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 10: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_centumbob_ad_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_centumbob_ad_inquiries_updated_at ON centumbob_ad_inquiries;

CREATE TRIGGER trigger_update_centumbob_ad_inquiries_updated_at
  BEFORE UPDATE ON centumbob_ad_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_centumbob_ad_inquiries_updated_at();
