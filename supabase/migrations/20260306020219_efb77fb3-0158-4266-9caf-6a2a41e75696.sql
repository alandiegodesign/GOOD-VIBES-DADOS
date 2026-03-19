
CREATE OR REPLACE FUNCTION public.find_user_by_email_or_cpf(p_identifier text)
RETURNS TABLE(user_id uuid, user_name text, user_email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.name as user_name, u.email as user_email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email = p_identifier OR p.cpf = p_identifier
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.transfer_order(p_order_id uuid, p_from_user_id uuid, p_to_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE public.orders
  SET user_id = p_to_user_id, updated_at = now()
  WHERE id = p_order_id
    AND user_id = p_from_user_id
    AND status = 'confirmed'
    AND validated_at IS NULL;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;
