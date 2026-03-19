
CREATE OR REPLACE FUNCTION public.get_events_list(p_creator_id uuid DEFAULT NULL)
RETURNS SETOF public.events
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT *
  FROM public.events
  WHERE deleted_at IS NULL
    AND (p_creator_id IS NULL OR created_by = p_creator_id)
  ORDER BY date ASC;
$$;
