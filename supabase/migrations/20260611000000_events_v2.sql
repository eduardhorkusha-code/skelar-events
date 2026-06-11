-- supabase/migrations/20260611000000_events_v2.sql
ALTER TABLE corporate_events
  ADD COLUMN IF NOT EXISTS owner         text,
  ADD COLUMN IF NOT EXISTS tags          text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ashby_url     text,
  ADD COLUMN IF NOT EXISTS long_list_url text,
  ADD COLUMN IF NOT EXISTS sub_dates     text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS show_time     boolean NOT NULL DEFAULT false;
