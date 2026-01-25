-- Add channel column to centumbob_chat_messages table
-- This allows messages to be categorized by restaurant or as global

-- Add channel column with default value 'all'
ALTER TABLE centumbob_chat_messages
ADD COLUMN IF NOT EXISTS channel VARCHAR(255) DEFAULT 'all';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_date
ON centumbob_chat_messages(channel, chat_date);

-- Add comment to the column
COMMENT ON COLUMN centumbob_chat_messages.channel IS 'Channel name: "all" for global channel, or restaurant name for restaurant-specific channel';

-- Update existing messages to have channel = 'all'
UPDATE centumbob_chat_messages
SET channel = 'all'
WHERE channel IS NULL;

-- Make channel NOT NULL after setting defaults
ALTER TABLE centumbob_chat_messages
ALTER COLUMN channel SET NOT NULL;
