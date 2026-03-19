
CREATE OR REPLACE FUNCTION public.admin_get_events_ticket_summary()
RETURNS TABLE(
  event_id uuid,
  event_title text,
  event_date date,
  producer_id uuid,
  producer_name text,
  is_visible boolean,
  location_type text,
  location_name text,
  total_quantity integer,
  sold_quantity bigint,
  revenue numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    e.id as event_id,
    e.title as event_title,
    e.date as event_date,
    e.created_by as producer_id,
    COALESCE(p.name, '—') as producer_name,
    e.is_visible,
    tl.location_type,
    tl.name as location_name,
    tl.quantity as total_quantity,
    COALESCE(SUM(oi.quantity), 0)::bigint as sold_quantity,
    COALESCE(SUM(oi.subtotal), 0) as revenue
  FROM events e
  LEFT JOIN profiles p ON p.user_id = e.created_by
  LEFT JOIN ticket_locations tl ON tl.event_id = e.id
  LEFT JOIN order_items oi ON oi.ticket_location_id = tl.id
    AND EXISTS (SELECT 1 FROM orders o WHERE o.id = oi.order_id AND o.status = 'confirmed')
  WHERE e.deleted_at IS NULL
  GROUP BY e.id, e.title, e.date, e.created_by, p.name, e.is_visible, e.created_at, tl.location_type, tl.name, tl.quantity, tl.sort_order
  ORDER BY e.created_at DESC, tl.sort_order;
$$;
