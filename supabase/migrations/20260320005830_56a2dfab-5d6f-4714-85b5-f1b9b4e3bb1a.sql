
CREATE OR REPLACE FUNCTION public.create_courtesy_order(
  p_event_id uuid,
  p_recipient_id uuid,
  p_ticket_location_id uuid,
  p_quantity integer,
  p_producer_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id uuid;
  v_loc record;
  v_decreased boolean;
  v_i integer;
BEGIN
  -- Verify producer owns the event
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = p_event_id AND created_by = p_producer_id) THEN
    RAISE EXCEPTION 'Unauthorized: not event owner';
  END IF;

  -- Decrease availability
  SELECT * INTO v_loc FROM ticket_locations WHERE id = p_ticket_location_id AND event_id = p_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Location not found'; END IF;

  UPDATE ticket_locations SET available_quantity = available_quantity - p_quantity
  WHERE id = p_ticket_location_id AND available_quantity >= p_quantity;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not enough availability'; END IF;

  -- Create order
  INSERT INTO orders (event_id, user_id, total_amount, status)
  VALUES (p_event_id, p_recipient_id, 0, 'confirmed')
  RETURNING id INTO v_order_id;

  -- Create order items
  IF (v_loc.location_type IN ('camarote_grupo', 'bistro')) AND v_loc.group_size > 1 THEN
    FOR v_i IN 1..(v_loc.group_size * p_quantity) LOOP
      INSERT INTO order_items (order_id, ticket_location_id, quantity, unit_price, subtotal, validation_code)
      VALUES (v_order_id, p_ticket_location_id, 1, 0, 0, '');
    END LOOP;
  ELSE
    INSERT INTO order_items (order_id, ticket_location_id, quantity, unit_price, subtotal, validation_code)
    VALUES (v_order_id, p_ticket_location_id, p_quantity, 0, 0, '');
  END IF;

  RETURN v_order_id;
END;
$$;
