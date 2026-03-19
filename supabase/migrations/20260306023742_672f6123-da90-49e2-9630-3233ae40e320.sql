ALTER TABLE public.ticket_locations
DROP CONSTRAINT IF EXISTS ticket_locations_location_type_check;

ALTER TABLE public.ticket_locations
ADD CONSTRAINT ticket_locations_location_type_check
CHECK (location_type = ANY (ARRAY['pista'::text, 'vip'::text, 'camarote'::text, 'camarote_grupo'::text, 'bistro'::text]));