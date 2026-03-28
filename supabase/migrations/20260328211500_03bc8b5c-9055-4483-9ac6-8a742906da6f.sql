
-- Make legacy columns nullable so new feed items don't need them
ALTER TABLE feed_items ALTER COLUMN subject_ximatar_id DROP NOT NULL;
ALTER TABLE feed_items ALTER COLUMN type DROP NOT NULL;
ALTER TABLE feed_items ALTER COLUMN source DROP NOT NULL;
ALTER TABLE feed_items ALTER COLUMN visibility SET DEFAULT '{}'::jsonb;
ALTER TABLE feed_items ALTER COLUMN payload SET DEFAULT '{}'::jsonb;
