
-- Fix existing empty-string CPFs to NULL
UPDATE public.profiles SET cpf = NULL WHERE cpf = '';

-- Drop and recreate the unique index to be safe
DROP INDEX IF EXISTS profiles_cpf_unique;
CREATE UNIQUE INDEX profiles_cpf_unique ON public.profiles (cpf) WHERE cpf IS NOT NULL AND cpf != '';
