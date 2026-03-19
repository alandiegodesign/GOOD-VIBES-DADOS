
-- Add validation_code to order_items
ALTER TABLE public.order_items ADD COLUMN validation_code text;

-- Generate unique codes for existing rows
UPDATE public.order_items SET validation_code = upper(substr(md5(random()::text || id::text), 1, 8));

-- Add unique constraint and not null
ALTER TABLE public.order_items ALTER COLUMN validation_code SET NOT NULL;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_validation_code_unique UNIQUE (validation_code);

-- Trigger to auto-generate validation_code on insert
CREATE OR REPLACE FUNCTION public.generate_validation_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.validation_code IS NULL OR NEW.validation_code = '' THEN
    NEW.validation_code := upper(substr(md5(random()::text || NEW.id::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_validation_code
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.generate_validation_code();

-- Lookup function for producer scanning (bypasses RLS)
CREATE OR REPLACE FUNCTION public.lookup_ticket_by_code(p_code text, p_producer_id uuid)
RETURNS TABLE(
  is_valid boolean,
  order_id uuid,
  event_title text,
  location_name text,
  buyer_name text,
  item_quantity integer,
  is_already_validated boolean,
  validation_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_item record;
  v_order record;
BEGIN
  -- Find the order item by validation code
  SELECT * INTO v_item FROM public.order_items WHERE order_items.validation_code = upper(trim(p_code));
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::integer, false, NULL::text;
    RETURN;
  END IF;

  -- Get order
  SELECT * INTO v_order FROM public.orders WHERE orders.id = v_item.order_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::integer, false, NULL::text;
    RETURN;
  END IF;

  -- Check producer owns the event
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE events.id = v_order.event_id AND events.created_by = p_producer_id) THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::integer, false, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (v_order.status = 'confirmed'),
    v_order.id,
    e.title,
    tl.name,
    COALESCE(p.name, '—'),
    v_item.quantity,
    (v_order.validated_at IS NOT NULL),
    v_item.validation_code
  FROM public.events e
  LEFT JOIN public.ticket_locations tl ON tl.id = v_item.ticket_location_id
  LEFT JOIN public.profiles p ON p.user_id = v_order.user_id
  WHERE e.id = v_order.event_id;
END;
$$;

-- Function for buyer to get their item codes (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_ticket_codes(p_order_id uuid, p_user_id uuid)
RETURNS TABLE(item_id uuid, validation_code text, location_name text, quantity integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT oi.id, oi.validation_code, tl.name, oi.quantity
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.ticket_locations tl ON tl.id = oi.ticket_location_id
  WHERE oi.order_id = p_order_id AND o.user_id = p_user_id;
$$;
