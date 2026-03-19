
-- Update handle_new_user to also save CPF and phone from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, user_type, phone, cpf)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'cliente'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'cpf', '')), '')
  );
  RETURN NEW;
END;
$$;
