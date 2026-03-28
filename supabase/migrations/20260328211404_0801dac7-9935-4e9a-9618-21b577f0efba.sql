
-- Add new columns to feed_items
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS feed_type TEXT DEFAULT 'system';
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'info';
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS action_label TEXT;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS actor_type TEXT;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS actor_avatar TEXT;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add metadata only if not exists (table already has it as jsonb but check)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feed_items' AND column_name = 'metadata') THEN
    ALTER TABLE feed_items ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feed_user_created ON feed_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_user_unread ON feed_items(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_type ON feed_items(feed_type);

-- RLS
ALTER TABLE feed_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own feed" ON feed_items;
CREATE POLICY "Users see own feed" ON feed_items
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
DROP POLICY IF EXISTS "Service role manages feed" ON feed_items;
CREATE POLICY "Service role manages feed" ON feed_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Users mark own feed read" ON feed_items;
CREATE POLICY "Users mark own feed read" ON feed_items
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
