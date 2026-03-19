
-- Add validated_at column to orders
ALTER TABLE public.orders ADD COLUMN validated_at timestamp with time zone DEFAULT NULL;

-- Create a comprehensive function for producer ticket monitoring with buyer info
CREATE OR REPLACE FUNCTION public.get_producer_tickets(p_user_id uuid)
RETURNS TABLE(
  order_id uuid,
  event_id uuid,
  event_title text,
  event_date date,
  buyer_id uuid,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  buyer_cpf text,
  order_status text,
  validated_at timestamp with time zone,
  total_amount numeric,
  order_created_at timestamp with time zone,
  order_updated_at timestamp with time zone,
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
    p.name as buyer_name,
    u.email as buyer_email,
    p.phone as buyer_phone,
    p.cpf as buyer_cpf,
    o.status as order_status,
    o.validated_at,
    o.total_amount,
    o.created_at as order_created_at,
    o.updated_at as order_updated_at,
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
  LEFT JOIN profiles p ON p.user_id = o.user_id
  LEFT JOIN auth.users u ON u.id = o.user_id
  WHERE e.created_by = p_user_id
  ORDER BY o.created_at DESC;
$$;

-- Create function to validate an order (mark as validated)
CREATE OR REPLACE FUNCTION public.validate_order(p_order_id uuid, p_producer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE public.orders
  SET validated_at = now()
  WHERE id = p_order_id
    AND validated_at IS NULL
    AND EXISTS (
      SELECT 1 FROM events e WHERE e.id = orders.event_id AND e.created_by = p_producer_id
    );
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;
