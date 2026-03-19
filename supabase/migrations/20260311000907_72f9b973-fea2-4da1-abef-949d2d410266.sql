
-- Drop the existing unique constraint on cpf that blocks signups
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cpf_key;

-- Re-create as a unique index that allows multiple NULLs
CREATE UNIQUE INDEX profiles_cpf_unique ON public.profiles (cpf) WHERE cpf IS NOT NULL;
