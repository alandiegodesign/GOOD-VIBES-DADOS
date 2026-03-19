-- Ensure every ticket item receives a unique validation code automatically
CREATE OR REPLACE FUNCTION public.generate_validation_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
BEGIN
  IF NEW.validation_code IS NULL OR btrim(NEW.validation_code) = '' THEN
    LOOP
      v_code := upper(substr(md5(random()::text || clock_timestamp()::text || COALESCE(NEW.id::text, '')), 1, 8));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.order_items oi WHERE oi.validation_code = v_code
      );
    END LOOP;
    NEW.validation_code := v_code;
  ELSE
    NEW.validation_code := upper(btrim(NEW.validation_code));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_validation_code ON public.order_items;
CREATE TRIGGER trg_generate_validation_code
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.generate_validation_code();

-- Backfill existing rows missing a code
UPDATE public.order_items oi
SET validation_code = upper(substr(md5(random()::text || clock_timestamp()::text || oi.id::text), 1, 8))
WHERE oi.validation_code IS NULL OR btrim(oi.validation_code) = '';

-- Prevent future duplicates at the database level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND indexname = 'order_items_validation_code_uidx'
  ) THEN
    CREATE UNIQUE INDEX order_items_validation_code_uidx ON public.order_items (validation_code);
  END IF;
END;
$$;