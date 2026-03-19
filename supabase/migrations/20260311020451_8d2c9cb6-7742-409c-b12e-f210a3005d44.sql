
-- Admin version of lookup_ticket_by_code that skips producer ownership check
CREATE OR REPLACE FUNCTION public.admin_lookup_ticket_by_code(p_code text)
RETURNS TABLE(is_valid boolean, order_id uuid, event_title text, location_name text, buyer_name text, item_quantity integer, is_already_validated boolean, validation_code text, producer_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item record;
  v_order record;
BEGIN
  -- Check caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::integer, false, NULL::text, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO v_item FROM public.order_items WHERE order_items.validation_code = upper(trim(p_code));
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::integer, false, NULL::text, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE orders.id = v_item.order_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::integer, false, NULL::text, NULL::text;
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
    v_item.validation_code,
    COALESCE(prod.name, '—')
  FROM public.events e
  LEFT JOIN public.ticket_locations tl ON tl.id = v_item.ticket_location_id
  LEFT JOIN public.profiles p ON p.user_id = v_order.user_id
  LEFT JOIN public.profiles prod ON prod.user_id = e.created_by
  WHERE e.id = v_order.event_id;
END;
$function$;

-- Admin version of validate_order that skips producer ownership check
CREATE OR REPLACE FUNCTION public.admin_validate_order(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Check caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN false;
  END IF;

  UPDATE public.orders
  SET validated_at = now()
  WHERE id = p_order_id
    AND validated_at IS NULL;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$function$;
