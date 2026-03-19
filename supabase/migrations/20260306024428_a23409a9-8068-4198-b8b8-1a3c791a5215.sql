
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

ALTER TABLE public.ticket_locations ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
