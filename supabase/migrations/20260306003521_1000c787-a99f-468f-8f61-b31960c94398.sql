
-- Add new fields for enhanced event creation
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS end_time text DEFAULT '',
  ADD COLUMN IF NOT EXISTS end_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS location_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS policies jsonb DEFAULT '[]'::jsonb;
