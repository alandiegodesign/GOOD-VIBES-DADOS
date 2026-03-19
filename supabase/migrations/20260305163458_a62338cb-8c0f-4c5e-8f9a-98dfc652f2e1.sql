
-- Add CPF column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text UNIQUE;

-- Create function to lookup email by CPF (security definer to access profiles)
CREATE OR REPLACE FUNCTION public.get_email_by_cpf(p_cpf text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE p.cpf = p_cpf
  LIMIT 1;
$$;
