
-- Function to get sales summary for a producer's events
CREATE OR REPLACE FUNCTION public.get_producer_sales(p_user_id uuid)
RETURNS TABLE (
  order_id uuid,
  event_id uuid,
  event_title text,
  event_date date,
  buyer_id uuid,
  order_status text,
  total_amount numeric,
  order_created_at timestamptz,
  item_id uuid,
  location_name text,
  location_type text,
  item_quantity integer,
  item_unit_price numeric,
  item_subtotal numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id as order_id,
    e.id as event_id,
    e.title as event_title,
    e.date as event_date,
    o.user_id as buyer_id,
    o.status as order_status,
    o.total_amount,
    o.created_at as order_created_at,
    oi.id as item_id,
    tl.name as location_name,
    tl.location_type,
    oi.quantity as item_quantity,
    oi.unit_price as item_unit_price,
    oi.subtotal as item_subtotal
  FROM orders o
  JOIN events e ON e.id = o.event_id
  JOIN order_items oi ON oi.order_id = o.id
  JOIN ticket_locations tl ON tl.id = oi.ticket_location_id
  WHERE e.created_by = p_user_id
  ORDER BY o.created_at DESC;
$$;
