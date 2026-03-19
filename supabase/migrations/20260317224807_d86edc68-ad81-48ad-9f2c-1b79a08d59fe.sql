
-- Add new values to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'atendente';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'desenvolvedor';
